import os
import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from app.db.session import get_db_connection

logger = logging.getLogger("nexis.error_locator")

# Directories and file patterns to ignore during codebase searches
IGNORED_DIRS = {
    "node_modules", ".git", "dist", "build", ".next", "__pycache__",
    ".pytest_cache", "venv", ".venv", "env", ".cache", "coverage"
}
SOURCE_EXTENSIONS = (
    ".jsx", ".tsx", ".js", ".ts", ".py", ".vue", ".svelte",
    ".html", ".css", ".scss", ".json"
)


class ErrorLocatorService:
    """
    Intelligently maps minified client errors, unhandled exceptions, and missing symbols
    to exact source repository files, line numbers, enclosing functions, and patches.
    """

    def extract_symbols_from_error(self, message: str, stack: Optional[str] = None) -> List[str]:
        """
        Extracts variable or function symbols from error messages.
        e.g. 'ReferenceError: showSubjectModal is not defined' -> ['showSubjectModal']
             'TypeError: Cannot read properties of undefined (reading 'items')' -> ['items']
        """
        text = f"{message} {stack or ''}"
        symbols = []

        # 1. ReferenceError / is not defined
        ref_matches = re.findall(r"(?:Uncaught\s+)?ReferenceError:\s*(\w+)\s+is not defined", text, re.IGNORECASE)
        symbols.extend(ref_matches)

        not_def_matches = re.findall(r"(\w+)\s+is not defined", text, re.IGNORECASE)
        symbols.extend(not_def_matches)

        # 2. NameError
        name_matches = re.findall(r"NameError:\s*name\s+'(\w+)'\s+is not defined", text)
        symbols.extend(name_matches)

        # 3. TypeError reading property
        reading_matches = re.findall(r"reading\s+['\"](\w+)['\"]", text, re.IGNORECASE)
        symbols.extend(reading_matches)

        # 4. is not a function
        func_matches = re.findall(r"(\w+)\.(\w+)\s+is not a function", text, re.IGNORECASE)
        for obj, method in func_matches:
            symbols.append(method)
            symbols.append(obj)

        # 5. Generic undefined symbol
        generic_matches = re.findall(r"['\"](\w{4,40})['\"]\s+is undefined", text, re.IGNORECASE)
        symbols.extend(generic_matches)

        # Deduplicate while preserving order, filter out common noise
        noise = {"null", "undefined", "true", "false", "object", "function", "string", "number", "vendor", "assets"}
        cleaned = []
        for s in symbols:
            s_clean = s.strip()
            if s_clean and s_clean not in noise and len(s_clean) > 2 and s_clean not in cleaned:
                cleaned.append(s_clean)

        return cleaned

    def get_software_repo_path(self, software_id: Optional[str] = None) -> Optional[Tuple[str, str]]:
        """
        Retrieves the local_repo_path for the given software_id from SQLite.
        If software_id is missing or invalid, falls back to the most active/relevant software.
        """
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            if software_id:
                cursor.execute(
                    "SELECT id, local_repo_path FROM softwares WHERE id = ? OR name LIKE ? LIMIT 1;",
                    (software_id, f"%{software_id}%")
                )
                row = cursor.fetchone()
                if row and row["local_repo_path"] and os.path.isdir(row["local_repo_path"]):
                    return row["id"], row["local_repo_path"]

            # Fallback: find any software with a valid local_repo_path
            cursor.execute("SELECT id, local_repo_path FROM softwares WHERE local_repo_path IS NOT NULL;")
            for r in cursor.fetchall():
                p = r["local_repo_path"]
                if p and os.path.isdir(p):
                    return r["id"], p
            return None
        finally:
            conn.close()

    def find_symbol_in_repo(self, repo_path: str, symbol: str) -> List[Dict[str, Any]]:
        """
        Searches all non-ignored source files in the repository for occurrences of the symbol.
        """
        results = []
        for root, dirs, files in os.walk(repo_path):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]

            for filename in files:
                if filename.endswith(SOURCE_EXTENSIONS):
                    file_path = os.path.join(root, filename)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            for line_idx, line in enumerate(f, 1):
                                if symbol in line:
                                    rel_path = os.path.relpath(file_path, repo_path)
                                    results.append({
                                        "file_path": rel_path,
                                        "absolute_path": file_path,
                                        "line_number": line_idx,
                                        "line_content": line.strip(),
                                    })
                    except Exception as e:
                        logger.debug(f"Failed to read file {file_path}: {e}")

        # Rank matches: prefer src/ components/ pages/ over test or config files
        def score_match(m):
            score = 0
            p = m["file_path"].lower()
            if "src/" in p:
                score += 50
            if "pages/" in p or "components/" in p:
                score += 40
            if p.endswith((".jsx", ".tsx")):
                score += 30
            elif p.endswith((".js", ".ts", ".py")):
                score += 20
            if "test" in p or "spec" in p:
                score -= 30
            return score

        results.sort(key=score_match, reverse=True)
        return results

    def extract_enclosing_scope(self, absolute_path: str, target_line: int) -> str:
        """
        Inspects lines before target_line to find enclosing function or component declaration.
        """
        try:
            with open(absolute_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception:
            return "Root"

        # Search upwards from target_line
        max_lookback = max(0, target_line - 200)
        func_patterns = [
            r"export\s+default\s+function\s+([A-Za-z0-9_]+)",
            r"export\s+function\s+([A-Za-z0-9_]+)",
            r"function\s+([A-Za-z0-9_]+)",
            r"const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>",
            r"class\s+([A-Za-z0-9_]+)",
            r"def\s+([A-Za-z0-9_]+)\s*\(",
        ]

        for i in range(min(target_line - 1, len(lines) - 1), max_lookback - 1, -1):
            line = lines[i]
            for pat in func_patterns:
                match = re.search(pat, line)
                if match:
                    return f"{match.group(1)}()"

        return "Component"

    def build_source_window(
        self, absolute_path: str, target_line: int, window_radius: int = 6
    ) -> Dict[str, Any]:
        """
        Builds structured source lines around the target line.
        """
        try:
            with open(absolute_path, "r", encoding="utf-8", errors="ignore") as f:
                all_lines = f.readlines()
        except Exception:
            return {
                "startLine": target_line,
                "lines": [{"num": target_line, "code": "// Source code unavailable", "isTarget": True}],
            }

        total = len(all_lines)
        start_idx = max(0, target_line - 1 - window_radius)
        end_idx = min(total, target_line + window_radius)

        lines_out = []
        for idx in range(start_idx, end_idx):
            line_no = idx + 1
            code_str = all_lines[idx].rstrip("\r\n")
            lines_out.append({
                "num": line_no,
                "code": code_str,
                "isTarget": (line_no == target_line),
            })

        return {
            "startLine": start_idx + 1,
            "lines": lines_out,
        }

    def locate_and_remediate(
        self,
        error_message: str,
        software_id: Optional[str] = None,
        stack_trace: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point: maps minified error to source file, builds AI recommendation and patch.
        """
        symbols = self.extract_symbols_from_error(error_message, stack_trace)
        repo_info = self.get_software_repo_path(software_id)

        if not repo_info:
            return {
                "found": False,
                "error": "No enrolled software with a valid local_repo_path found.",
                "symbols_detected": symbols,
            }

        actual_software_id, repo_path = repo_info

        # Search for detected symbols in repo
        matched_results = []
        best_symbol = None
        for sym in symbols:
            matches = self.find_symbol_in_repo(repo_path, sym)
            if matches:
                matched_results = matches
                best_symbol = sym
                break

        if not matched_results:
            return {
                "found": False,
                "software_id": actual_software_id,
                "repo_path": repo_path,
                "symbols_detected": symbols,
                "message": f"Could not map symbols {symbols} to source files in {repo_path}.",
            }

        top_match = matched_results[0]
        file_path = top_match["file_path"]
        absolute_path = top_match["absolute_path"]
        line_number = top_match["line_number"]
        enclosing_scope = self.extract_enclosing_scope(absolute_path, line_number)
        source_window = self.build_source_window(absolute_path, line_number)

        # Synthesize Root Cause & Patch
        root_cause = (
            f"Symbol '{best_symbol}' is referenced in {enclosing_scope} ({file_path}:{line_number}) "
            f"but has not been declared or initialized in the component scope. "
            f"In production, Vite/Rollup bundled this code into vendor bundle assets, causing an unhandled "
            f"ReferenceError when evaluated by the browser UI."
        )

        resolution = (
            f"Declare '{best_symbol}' using the appropriate React hook (useState) or import statement "
            f"at the top of {enclosing_scope} in {file_path}."
        )

        # Default patch synthesis for React state / hooks
        patch_before = top_match["line_content"]
        patch_after = f"// Ensure {best_symbol} is declared with useState or safe fallback\n{patch_before}"
        
        if "Modal" in (best_symbol or "") or "show" in (best_symbol or ""):
            patch_after = f"const [{best_symbol}, set{best_symbol[:1].upper()}{best_symbol[1:]}] = useState(false);"
        elif "List" in (best_symbol or "") or "items" in (best_symbol or ""):
            patch_after = f"const [{best_symbol}, set{best_symbol[:1].upper()}{best_symbol[1:]}] = useState([]);"

        unit_test_code = (
            f"describe('{enclosing_scope} Error Prevention', () => {{\n"
            f"  it('renders without throwing ReferenceError for {best_symbol}', () => {{\n"
            f"    expect(typeof {best_symbol} !== 'undefined').toBe(true);\n"
            f"  }};\n"
            f"}});"
        )

        return {
            "found": True,
            "software_id": actual_software_id,
            "file_path": file_path,
            "absolute_path": absolute_path,
            "line_number": line_number,
            "enclosing_scope": enclosing_scope,
            "symbol": best_symbol,
            "symbols_detected": symbols,
            "source_window": source_window,
            "patch_diff": {
                "before": patch_before,
                "after": patch_after,
                "description": f"Declare missing variable '{best_symbol}' in {enclosing_scope}.",
            },
            "root_cause": root_cause,
            "resolution": resolution,
            "unit_test_code": unit_test_code,
            "all_matches": [
                {"file": m["file_path"], "line": m["line_number"], "content": m["line_content"]}
                for m in matched_results[:5]
            ],
        }


error_locator_service = ErrorLocatorService()
