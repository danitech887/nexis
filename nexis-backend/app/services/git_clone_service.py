import os
import re
import subprocess
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("nexis.git_clone")

DEFAULT_PROJECTS_DIR = os.path.expanduser("~/Desktop/Projects")


def sanitize_folder_name(name: str) -> str:
    cleaned = re.sub(r"[^\w\-.]", "_", name.strip())
    return cleaned or "cloned-repo"


def extract_repo_name_from_url(repo_url: str) -> str:
    url = repo_url.strip().rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]
    name = url.split("/")[-1].split(":")[-1]
    return sanitize_folder_name(name)


class GitCloneService:
    def clone_repository(
        self,
        repo_url: str,
        destination_dir: Optional[str] = None,
        custom_folder_name: Optional[str] = None,
        branch: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Clones a remote Git repository into the specified local destination directory.
        If the target folder already exists, checks if it is the same repo.
        """
        if not repo_url or not repo_url.strip():
            return {
                "success": False,
                "error": "Repository URL is required",
                "cloned_path": "",
                "already_existed": False,
            }

        repo_url = repo_url.strip()
        base_dir = os.path.abspath(
            os.path.expanduser((destination_dir or DEFAULT_PROJECTS_DIR).strip())
        )

        try:
            os.makedirs(base_dir, exist_ok=True)
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to create or access destination directory '{base_dir}': {str(e)}",
                "cloned_path": "",
                "already_existed": False,
            }

        folder_name = custom_folder_name.strip() if custom_folder_name and custom_folder_name.strip() else extract_repo_name_from_url(repo_url)
        target_path = os.path.join(base_dir, folder_name)

        # Check if directory already exists
        if os.path.exists(target_path):
            git_dir = os.path.join(target_path, ".git")
            if os.path.isdir(git_dir):
                logger.info(f"Directory already exists and is a git repository: {target_path}")
                return {
                    "success": True,
                    "cloned_path": target_path,
                    "folder_name": folder_name,
                    "already_existed": True,
                    "message": f"Repository already exists at {target_path}. Using existing local repository.",
                }
            else:
                return {
                    "success": False,
                    "error": f"Destination path already exists and is not a Git repository: {target_path}",
                    "cloned_path": target_path,
                    "already_existed": True,
                }

        # Execute git clone
        logger.info(f"Cloning {repo_url} into {target_path}...")
        try:
            cmd = ["git", "clone"]
            if branch and branch.strip():
                cmd.extend(["-b", branch.strip()])
            cmd.extend([repo_url, target_path])
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=180,  # 3 min timeout for larger repos
            )
            if result.returncode != 0:
                err_msg = result.stderr.strip() or result.stdout.strip() or "Git clone failed"
                logger.error(f"git clone error: {err_msg}")
                return {
                    "success": False,
                    "error": f"Git clone failed: {err_msg}",
                    "cloned_path": target_path,
                    "already_existed": False,
                }

            logger.info(f"Successfully cloned repository to {target_path}")
            return {
                "success": True,
                "cloned_path": target_path,
                "folder_name": folder_name,
                "already_existed": False,
                "message": f"Repository successfully cloned to {target_path}",
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Git clone operation timed out after 180 seconds",
                "cloned_path": target_path,
                "already_existed": False,
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to execute git clone: {str(e)}",
                "cloned_path": target_path,
                "already_existed": False,
            }


git_clone_service = GitCloneService()
