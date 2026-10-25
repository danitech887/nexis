import sqlite3
import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.db.session import get_db_connection

logger = logging.getLogger("nexis.logs")


class LogStorageService:
    def __init__(self):
        self._ensure_table()

    def _ensure_table(self):
        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS telemetry_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        software_id TEXT NOT NULL,
                        system_id TEXT NOT NULL,
                        level TEXT NOT NULL,
                        tag TEXT NOT NULL,
                        message TEXT NOT NULL,
                        stack_trace TEXT,
                        metadata TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    """
                )
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_logs_software_time ON telemetry_logs(software_id, timestamp);"
                )
                conn.execute(
                    "CREATE INDEX IF NOT EXISTS idx_logs_system_level ON telemetry_logs(system_id, level);"
                )
        finally:
            conn.close()

    def insert_log(
        self,
        system_id: str,
        message: str,
        level: str = "INFO",
        tag: str = "application",
        software_id: Optional[str] = None,
        stack_trace: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> int:
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.execute(
                    """
                    INSERT INTO telemetry_logs (
                        software_id, system_id, level, tag, message, stack_trace, metadata, timestamp
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        software_id or system_id,
                        system_id,
                        level.upper(),
                        tag,
                        message,
                        stack_trace,
                        json.dumps(metadata or {}),
                        (timestamp or datetime.utcnow()).isoformat(),
                    ),
                )
                return cursor.lastrowid
        finally:
            conn.close()

    def query_logs(
        self,
        software_id: Optional[str] = None,
        system_id: Optional[str] = None,
        level: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100,
        since_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            query = "SELECT * FROM telemetry_logs WHERE 1=1"
            params: List[Any] = []

            if software_id:
                base_slug = software_id.split("-")[0]
                query += " AND (software_id = ? OR software_id LIKE ? OR software_id LIKE ? OR system_id LIKE ?)"
                params.extend([software_id, f"{software_id}%", f"{base_slug}%", f"{base_slug}%"])

            if isinstance(system_id, str) and system_id.lower() != "all":
                query += " AND system_id = ?"
                params.append(system_id)

            if isinstance(level, str) and level.upper() != "ALL":
                query += " AND level = ?"
                params.append(level.upper())

            if isinstance(search, str) and search.strip():
                query += " AND (message LIKE ? OR tag LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])

            limit_val = limit if isinstance(limit, int) else 100
            since_val = since_id if isinstance(since_id, int) else None

            if since_val is not None:
                query += " AND id > ?"
                params.append(since_val)

            query += " ORDER BY id DESC LIMIT ?"
            params.append(limit_val)

            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()

            # Return chronologically ascending for terminal view
            results = []
            for r in reversed(rows):
                results.append({
                    "id": r["id"],
                    "software_id": r["software_id"],
                    "system_id": r["system_id"],
                    "source": f"{r['system_id']}:{r['tag']}",
                    "level": r["level"],
                    "tag": r["tag"],
                    "msg": r["message"],
                    "stack_trace": r["stack_trace"],
                    "metadata": json.loads(r["metadata"] or "{}"),
                    "ts": r["timestamp"].replace("T", " ")[:23],
                })
            return results
        finally:
            conn.close()

    def clear_logs(self, software_id: Optional[str] = None, system_id: Optional[str] = None) -> int:
        conn = get_db_connection()
        try:
            with conn:
                if system_id:
                    cursor = conn.execute("DELETE FROM telemetry_logs WHERE system_id = ?;", (system_id,))
                elif software_id:
                    cursor = conn.execute("DELETE FROM telemetry_logs WHERE software_id = ?;", (software_id,))
                else:
                    cursor = conn.execute("DELETE FROM telemetry_logs;")
                return cursor.rowcount
        finally:
            conn.close()


log_storage_service = LogStorageService()
