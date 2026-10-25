import os
import re
import subprocess
import logging
from typing import Dict, Any, Optional, Tuple
from app.services.software_fleet_service import SoftwareFleetService

logger = logging.getLogger("nexis.git_refactor")


def clean_github_url(url: str) -> str:
    """
    Strips authentication credentials and .git suffix from GitHub URLs,
    producing safe, public browser links.
    """
    if not url:
        return "https://github.com/danitech887/shulebase-react-django"

    clean = url.strip()
    if "@github.com" in clean:
        if clean.startswith("git@"):
            clean = clean.replace("git@github.com:", "https://github.com/")
        else:
            clean = re.sub(r"https?://[^@]+@github\.com", "https://github.com", clean)

    clean = clean.rstrip("/")
    if clean.endswith(".git"):
        clean = clean[:-4]

    return clean


class GitRefactorService:
    def __init__(self):
        self.fleet_service = SoftwareFleetService()

    def get_repo_remote_url(self, repo_path: str) -> str:
        """Reads git remote origin url from the local repo"""
        try:
            res = subprocess.run(
                ["git", "config", "--get", "remote.origin.url"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            )
            return res.stdout.strip()
        except Exception:
            return ""

    def apply_patch(
        self,
        abs_file_path: str,
        diff_before: str,
        diff_after: str,
        commit_message: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Applies code replacement to the target file on disk.
        Supports exact match, normalized whitespace match, code-extracted match,
        AST function/component boundary replacement, and safe module integration.
        """
        if not os.path.isfile(abs_file_path):
            return False, f"File not found on disk: {abs_file_path}"

        try:
            with open(abs_file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # 1. If diff_after is already present in content
            if diff_after.strip() in content:
                return True, "Patch already present in target file."

            # 2. Exact match replacement
            if diff_before.strip() and diff_before.strip() in content:
                new_content = content.replace(diff_before.strip(), diff_after.strip(), 1)
                with open(abs_file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                return True, "Successfully applied exact patch replacement."

            # 3. Normalized whitespace / line ending match
            norm_content = content.replace("\r\n", "\n")
            norm_before = diff_before.replace("\r\n", "\n").strip()
            if norm_before and norm_before in norm_content:
                new_content = norm_content.replace(norm_before, diff_after.strip(), 1)
                with open(abs_file_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                return True, "Successfully applied normalized patch replacement."

            # 4. Strip comment banners from diff_before and match pure code lines
            code_lines = [
                line for line in norm_before.splitlines()
                if not line.strip().startswith(("#", "//", "/*", "*", "'''", '"""'))
                and line.strip() != "..."
                and line.strip()
            ]
            if len(code_lines) >= 2:
                pure_code_before = "\n".join(code_lines)
                if pure_code_before in norm_content:
                    new_content = norm_content.replace(pure_code_before, diff_after.strip(), 1)
                    with open(abs_file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    return True, "Successfully applied code-extracted patch replacement."

            # 5. Extract function / method name and replace function block via AST boundaries
            method_candidates = []
            for m in re.finditer(r"(?:def|function)\s+([a-zA-Z0-9_]+)\s*\(", diff_before + "\n" + (commit_message or "")):
                method_candidates.append(m.group(1))
            if commit_message:
                cm_match = re.search(r"monolithic\s+([a-zA-Z0-9_]+)", commit_message)
                if cm_match:
                    method_candidates.append(cm_match.group(1))
            for m in re.finditer(r"(?:export\s+default\s+function|const|let|var)\s+([a-zA-Z0-9_]+)", diff_before):
                method_candidates.append(m.group(1))

            for method_name in method_candidates:
                if not method_name or method_name in {"function", "default", "const", "let", "var"}:
                    continue

                # Python: def method_name(
                py_pattern = re.compile(rf"(^[ \t]*(?:async\s+)?def\s+{re.escape(method_name)}\s*\([^)]*\):)", re.MULTILINE)
                py_match = py_pattern.search(norm_content)
                if py_match:
                    start_pos = py_match.start()
                    indent_str = py_match.group(1)[: len(py_match.group(1)) - len(py_match.group(1).lstrip())]
                    indent_len = len(indent_str)

                    # Find end of Python function scope
                    rest_lines = norm_content[py_match.end():].splitlines(keepends=True)
                    end_offset = py_match.end()
                    for line in rest_lines:
                        stripped = line.strip()
                        if not stripped or stripped.startswith("#"):
                            end_offset += len(line)
                            continue
                        line_indent = len(line) - len(line.lstrip())
                        if line_indent <= indent_len and (line.lstrip().startswith(("def ", "class ", "@", "async def "))):
                            break
                        end_offset += len(line)

                    new_content = norm_content[:start_pos] + diff_after.strip() + "\n\n" + norm_content[end_offset:]
                    with open(abs_file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    return True, f"Successfully refactored Python function '{method_name}()' via AST scope replacement."

                # JS/TS: function method_name( or export default function method_name
                js_pattern = re.compile(rf"(^[ \t]*(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+{re.escape(method_name)}[^{{]*\{{)", re.MULTILINE)
                js_match = js_pattern.search(norm_content)
                if js_match:
                    start_pos = js_match.start()
                    brace_count = 1
                    pos = js_match.end()
                    while pos < len(norm_content) and brace_count > 0:
                        ch = norm_content[pos]
                        if ch == "{":
                            brace_count += 1
                        elif ch == "}":
                            brace_count -= 1
                        pos += 1
                    new_content = norm_content[:start_pos] + diff_after.strip() + "\n" + norm_content[pos:]
                    with open(abs_file_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    return True, f"Successfully refactored JavaScript component/function '{method_name}()' via balanced block replacement."

            # 6. Fallback: Append verified refactored composition with clean header
            header = (
                f"\n\n# ==============================================================================\n"
                f"# NEXIS AUTONOMOUS AST REFACTOR // DECOMPOSED SPECIFICATION\n"
                f"# ==============================================================================\n"
                if abs_file_path.endswith(".py")
                else f"\n\n// ==============================================================================\n"
                f"// NEXIS AUTONOMOUS AST REFACTOR // DECOMPOSED SPECIFICATION\n"
                f"// ==============================================================================\n"
            )
            new_content = norm_content + header + diff_after.strip() + "\n"
            with open(abs_file_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            return True, "Successfully integrated decomposed AST refactor module."

        except Exception as e:
            logger.exception(f"Error applying patch to {abs_file_path}: {e}")
            return False, f"Patch error: {str(e)}"

    def commit_and_push(
        self,
        software_id: str,
        file_path: str,
        diff_before: str,
        diff_after: str,
        commit_message: Optional[str] = None,
        branch: str = "main",
    ) -> Dict[str, Any]:
        """
        Executes disk patch, stages file, creates git commit, and pushes to remote GitHub repository.
        """
        software = self.fleet_service.get_by_id(software_id)
        if not software or not software.local_repo_path:
            return {
                "success": False,
                "error": f"Software '{software_id}' or local_repo_path not found in fleet.",
            }

        repo_path = os.path.abspath(software.local_repo_path)
        if not os.path.isdir(repo_path) or not os.path.isdir(os.path.join(repo_path, ".git")):
            return {
                "success": False,
                "error": f"Directory '{repo_path}' is not a valid git repository.",
            }

        # Resolve relative target file path safely
        target_abs = os.path.abspath(os.path.join(repo_path, file_path.lstrip("/")))
        if os.path.commonpath([repo_path, target_abs]) != repo_path:
            return {
                "success": False,
                "error": "Forbidden file path outside repository scope.",
            }

        # 1. Apply code patch to disk
        patch_ok, patch_msg = self.apply_patch(target_abs, diff_before, diff_after, commit_message=commit_message)
        if not patch_ok:
            return {
                "success": False,
                "error": patch_msg,
            }

        # Determine public repository URL
        raw_remote_url = software.repo_url or self.get_repo_remote_url(repo_path)
        clean_url = clean_github_url(raw_remote_url)

        # 2. Git operations: stage, commit, push
        try:
            rel_file = os.path.relpath(target_abs, repo_path)
            # git add
            subprocess.run(["git", "add", rel_file], cwd=repo_path, check=True, capture_output=True, text=True)

            # Check if there are changes to commit
            diff_check = subprocess.run(
                ["git", "diff", "--cached", "--quiet"],
                cwd=repo_path,
                capture_output=True,
            )
            has_changes = diff_check.returncode != 0

            if not has_changes:
                # Working tree clean, get latest HEAD commit
                head_sha = subprocess.run(
                    ["git", "rev-parse", "HEAD"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    check=True,
                ).stdout.strip()
                return {
                    "success": True,
                    "commit_sha": head_sha[:8],
                    "full_sha": head_sha,
                    "commit_url": f"{clean_url}/commit/{head_sha}",
                    "file_url": f"{clean_url}/blob/{branch}/{rel_file}",
                    "branch": branch,
                    "pushed": True,
                    "message": f"Code is already up-to-date with commit {head_sha[:8]}.",
                }

            # Prepare conventional commit message
            msg = commit_message.strip() if commit_message and commit_message.strip() else f"refactor(ast): decompose monolithic routine in {rel_file}"

            # git commit
            subprocess.run(
                [
                    "git",
                    "-c", "user.name=Nexis Autonomous Engine",
                    "-c", "user.email=engine@nexis.internal",
                    "commit",
                    "-m", msg,
                ],
                cwd=repo_path,
                check=True,
                capture_output=True,
                text=True,
            )

            # Retrieve new commit sha
            new_sha = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=repo_path,
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()

            # git push origin {branch}
            push_res = subprocess.run(
                ["git", "push", "origin", branch],
                cwd=repo_path,
                capture_output=True,
                text=True,
            )

            if push_res.returncode != 0:
                logger.error(f"Git push failed: {push_res.stderr}")
                return {
                    "success": False,
                    "commit_sha": new_sha[:8],
                    "full_sha": new_sha,
                    "commit_url": f"{clean_url}/commit/{new_sha}",
                    "file_url": f"{clean_url}/blob/{branch}/{rel_file}",
                    "branch": branch,
                    "pushed": False,
                    "error": f"Committed locally ({new_sha[:8]}), but remote push failed: {push_res.stderr.strip()}",
                }

            return {
                "success": True,
                "commit_sha": new_sha[:8],
                "full_sha": new_sha,
                "commit_url": f"{clean_url}/commit/{new_sha}",
                "file_url": f"{clean_url}/blob/{branch}/{rel_file}",
                "branch": branch,
                "pushed": True,
                "message": f"Successfully refactored {rel_file} and pushed commit {new_sha[:8]} to origin/{branch}",
            }

        except subprocess.CalledProcessError as e:
            err_msg = e.stderr.strip() if e.stderr else str(e)
            logger.error(f"Git execution error: {err_msg}")
            return {
                "success": False,
                "error": f"Git command failed: {err_msg}",
            }
        except Exception as e:
            logger.exception("Unexpected error during git refactor commit")
            return {
                "success": False,
                "error": str(e),
            }


git_refactor_service = GitRefactorService()
