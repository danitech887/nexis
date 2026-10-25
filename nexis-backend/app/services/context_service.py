import os
import difflib
from typing import Dict, Any, Tuple, Optional
from app.core.config import settings


class ContextService:
    def __init__(self, repo_storage_path: Optional[str] = None):
        self.repo_storage_path = repo_storage_path or settings.REPOS_STORAGE_PATH

    def extract_file_snippet(
        self,
        file_path: str,
        target_line: int,
        window: int = 15,
        repo_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reads source file and extracts a surrounding window with 1-based line markers.
        """
        # Resolve real path
        full_path = self._resolve_path(file_path, repo_name)
        if not os.path.exists(full_path):
            return {
                "error": f"File not found: {file_path}",
                "snippet": "",
                "start_line": 0,
                "end_line": 0,
            }

        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        total_lines = len(lines)
        start_idx = max(0, target_line - 1 - window)
        end_idx = min(total_lines, target_line - 1 + window + 1)

        formatted_lines = []
        for idx in range(start_idx, end_idx):
            line_no = idx + 1
            marker = " >" if line_no == target_line else "  "
            formatted_lines.append(f"{marker} {line_no:4d} | {lines[idx].rstrip()}")

        return {
            "file_path": file_path,
            "target_line": target_line,
            "start_line": start_idx + 1,
            "end_line": end_idx,
            "total_lines": total_lines,
            "snippet": "\n".join(formatted_lines),
            "raw_snippet": "".join(lines[start_idx:end_idx]),
        }

    def generate_unified_diff(
        self,
        original_text: str,
        modified_text: str,
        filename: str = "patch.diff"
    ) -> str:
        """
        Produces a standard unified diff string between original code and patched code.
        """
        orig_lines = original_text.splitlines(keepends=True)
        mod_lines = modified_text.splitlines(keepends=True)
        diff = difflib.unified_diff(
            orig_lines,
            mod_lines,
            fromfile=f"a/{filename}",
            tofile=f"b/{filename}",
            lineterm=""
        )
        return "\n".join(diff)

    def _resolve_path(self, file_path: str, repo_name: Optional[str] = None) -> str:
        if os.path.isabs(file_path) and os.path.exists(file_path):
            return file_path
        if repo_name:
            candidate = os.path.join(self.repo_storage_path, repo_name, file_path.lstrip("/"))
            if os.path.exists(candidate):
                return candidate
        # Fallback to local working directory
        cwd_candidate = os.path.join(os.getcwd(), file_path.lstrip("/"))
        if os.path.exists(cwd_candidate):
            return cwd_candidate
        return file_path


context_service = ContextService()
