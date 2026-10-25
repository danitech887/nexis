import os
import glob
from typing import Dict, Any, Optional


def inspect_local_project_path(local_path: str) -> Dict[str, Any]:
    """
    Validates if a local filesystem path exists, checks directory access,
    and inspects signature files to auto-detect platform, framework, and entrypoints.
    """
    expanded_path = os.path.abspath(os.path.expanduser(local_path.strip()))

    if not os.path.exists(expanded_path):
        return {
            "valid": False,
            "error": f"Path does not exist on filesystem: {expanded_path}",
            "expanded_path": expanded_path,
            "platform_detected": "Unknown",
            "category_suggested": "Web API",
            "signature_files": [],
        }

    if not os.path.isdir(expanded_path):
        return {
            "valid": False,
            "error": f"Path is a file, not a directory: {expanded_path}",
            "expanded_path": expanded_path,
            "platform_detected": "Unknown",
            "category_suggested": "Web API",
            "signature_files": [],
        }

    # Gather top-level files
    try:
        entries = set(os.listdir(expanded_path))
    except Exception as e:
        return {
            "valid": False,
            "error": f"Permission denied or unreadable directory: {str(e)}",
            "expanded_path": expanded_path,
            "platform_detected": "Unknown",
            "category_suggested": "Web API",
            "signature_files": [],
        }

    detected_platform = "Generic Application"
    suggested_category = "Web API"
    signature_files = []

    # Detection logic
    if "manage.py" in entries:
        detected_platform = "Python / Django"
        suggested_category = "Web API"
        signature_files.append("manage.py")
    elif "build.gradle" in entries or "build.gradle.kts" in entries or "settings.gradle" in entries or "settings.gradle.kts" in entries:
        detected_platform = "Kotlin / Android"
        suggested_category = "Mobile"
        signature_files.extend([f for f in ["build.gradle", "build.gradle.kts", "settings.gradle.kts"] if f in entries])
    elif "pom.xml" in entries:
        detected_platform = "Java / Spring Boot"
        suggested_category = "Web API"
        signature_files.append("pom.xml")
    elif "package.json" in entries:
        signature_files.append("package.json")
        # Read package.json to refine
        try:
            with open(os.path.join(expanded_path, "package.json"), "r", encoding="utf-8") as f:
                content = f.read()
                if "next" in content:
                    detected_platform = "TypeScript / Next.js"
                    suggested_category = "Web API"
                elif "react-native" in content:
                    detected_platform = "React Native"
                    suggested_category = "Mobile"
                elif "electron" in content:
                    detected_platform = "TypeScript / Electron"
                    suggested_category = "Desktop"
                elif "react" in content:
                    detected_platform = "TypeScript / React"
                    suggested_category = "Web API"
                elif "vue" in content:
                    detected_platform = "TypeScript / Vue"
                    suggested_category = "Web API"
                else:
                    detected_platform = "Node.js / TypeScript"
                    suggested_category = "Web API"
        except Exception:
            detected_platform = "Node.js / JavaScript"
    elif any(f.endswith(".py") for f in entries) or "requirements.txt" in entries or "pyproject.toml" in entries:
        if "requirements.txt" in entries:
            signature_files.append("requirements.txt")
        if "pyproject.toml" in entries:
            signature_files.append("pyproject.toml")
        
        # Check for PyQt / GUI
        is_gui = False
        try:
            for py_file in glob.glob(os.path.join(expanded_path, "*.py"))[:5]:
                with open(py_file, "r", encoding="utf-8", errors="ignore") as f:
                    py_text = f.read()
                    if "PyQt" in py_text or "PySide" in py_text or "tkinter" in py_text:
                        is_gui = True
                        break
        except Exception:
            pass

        if is_gui:
            detected_platform = "Python / PyQt5"
            suggested_category = "Desktop"
        else:
            detected_platform = "Python / FastAPI"
            suggested_category = "Web API"
    elif "Cargo.toml" in entries:
        detected_platform = "Rust"
        suggested_category = "Web API"
        signature_files.append("Cargo.toml")
    elif "go.mod" in entries:
        detected_platform = "Go"
        suggested_category = "Web API"
        signature_files.append("go.mod")

    # Has git repo?
    has_git = ".git" in entries
    git_remote_url = None
    if has_git:
        try:
            import subprocess
            res = subprocess.run(
                ["git", "-C", expanded_path, "config", "--get", "remote.origin.url"],
                capture_output=True,
                text=True,
                timeout=2,
            )
            if res.returncode == 0 and res.stdout.strip():
                raw_remote = res.stdout.strip()
                # Clean auth tokens or SSH prefixes into standard HTTPS GitHub/GitLab URL
                # e.g. https://token@github.com/org/repo.git or git@github.com:org/repo.git
                if "github.com" in raw_remote:
                    if raw_remote.startswith("git@github.com:"):
                        repo_part = raw_remote.split("git@github.com:")[1]
                    elif "github.com/" in raw_remote:
                        repo_part = raw_remote.split("github.com/")[1]
                    else:
                        repo_part = raw_remote
                    repo_part = repo_part.rstrip(".git")
                    git_remote_url = f"https://github.com/{repo_part}"
                elif "gitlab.com" in raw_remote:
                    if raw_remote.startswith("git@gitlab.com:"):
                        repo_part = raw_remote.split("git@gitlab.com:")[1]
                    elif "gitlab.com/" in raw_remote:
                        repo_part = raw_remote.split("gitlab.com/")[1]
                    else:
                        repo_part = raw_remote
                    repo_part = repo_part.rstrip(".git")
                    git_remote_url = f"https://gitlab.com/{repo_part}"
                else:
                    git_remote_url = raw_remote.rstrip(".git")
        except Exception:
            pass

    return {
        "valid": True,
        "expanded_path": expanded_path,
        "exists": True,
        "has_git": has_git,
        "git_remote_url": git_remote_url,
        "platform_detected": detected_platform,
        "category_suggested": suggested_category,
        "signature_files": signature_files,
        "total_top_level_files": len(entries),
    }
