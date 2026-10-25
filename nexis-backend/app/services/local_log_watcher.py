import os
import glob
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.db.session import get_db_connection
from app.services.software_fleet_service import software_fleet_service
from app.services.log_storage_service import log_storage_service


class LocalLogWatcherService:
    """
    Scans local software repository directories for actual server logs,
    Django logs, error logs, build logs, and ingests them into SQLite.
    """

    BLOCKED_DIRECTORIES = {
        ".gradle", ".cache", ".local", "Android", "transforms", "caches",
        "build", "node_modules", ".git", ".venv", "venv", "VirtualBox",
        "intermediates", "system32", "site-packages"
    }

    BLOCKED_TAGS = {"manifest-merger", "VBox", "VBoxUI", "page"}

    def scan_and_ingest_software_logs(self, software_id: str, max_lines_per_file: int = 100) -> int:
        software = software_fleet_service.get_by_id(software_id)
        if not software or not software.local_repo_path:
            return 0

        repo_path = os.path.abspath(os.path.expanduser(software.local_repo_path.strip()))
        if not repo_path or not os.path.exists(repo_path) or not os.path.isdir(repo_path):
            return 0

        # Protect against scanning system root, /home, /root, /tmp or the user's home root directory
        home_dir = os.path.abspath(os.path.expanduser("~"))
        dangerous_roots = {"/", "/home", "/root", "/var", "/tmp", "/etc", "/usr", home_dir}
        if repo_path in dangerous_roots:
            return 0

        # Look for log directories and files
        log_patterns = [
            os.path.join(repo_path, "**", "*.log"),
            os.path.join(repo_path, "**", "logs", "*.log"),
            os.path.join(repo_path, "*.log"),
        ]

        found_files = set()
        for pattern in log_patterns:
            for file_path in glob.glob(pattern, recursive=True):
                if not os.path.isfile(file_path):
                    continue

                # Skip non-log extensions
                if not file_path.endswith((".log", ".out", ".err")):
                    continue

                # Check if path contains blocked directories or terms
                path_parts = file_path.replace("\\", "/").split("/")
                if any(blocked in path_parts or any(b in p for b in self.BLOCKED_DIRECTORIES) for p in path_parts for blocked in [p]):
                    continue

                if any(bt in file_path for bt in self.BLOCKED_TAGS):
                    continue

                try:
                    if os.path.getsize(file_path) < 10 * 1024 * 1024:
                        found_files.add(file_path)
                except OSError:
                    pass

        total_ingested = 0
        for log_file in found_files:
            total_ingested += self._parse_and_ingest_file(software_id, log_file, max_lines_per_file)

        return total_ingested

    def _parse_and_ingest_file(self, software_id: str, file_path: str, max_lines: int) -> int:
        rel_name = os.path.basename(file_path)
        tag = os.path.splitext(rel_name)[0] or "server"

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except Exception:
            return 0

        # Take last N lines
        recent_lines = lines[-max_lines:]
        ingested = 0

        # Get existing recent messages to avoid duplicate ingestion
        existing_logs = log_storage_service.query_logs(software_id=software_id, limit=200)
        existing_msgs = {l["msg"] for l in existing_logs}

        for line in recent_lines:
            cleaned = line.rstrip()
            if not cleaned or cleaned in existing_msgs:
                continue

            # Detect log level
            level = "INFO"
            if re.search(r"\b(ERROR|Traceback|Exception|Critical|Fail|Error:)\b", cleaned, re.IGNORECASE):
                level = "ERROR"
            elif re.search(r"\b(WARN|Warning)\b", cleaned, re.IGNORECASE):
                level = "WARN"
            elif re.search(r"\b(DEBUG)\b", cleaned, re.IGNORECASE):
                level = "DEBUG"

            # Parse timestamp if exists e.g. October 08, 2026 - 12:08:58 or 2026-10-20
            ts = None
            log_storage_service.insert_log(
                software_id=software_id,
                system_id=f"{software_id}-real-{tag}",
                level=level,
                tag=f"file.{tag}",
                message=cleaned,
                stack_trace=None,
                timestamp=ts or datetime.utcnow(),
            )
            ingested += 1

        return ingested


local_log_watcher = LocalLogWatcherService()
