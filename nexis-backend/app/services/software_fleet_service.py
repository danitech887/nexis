import secrets
import hashlib
import sqlite3
import re
from typing import List, Dict, Any, Optional, Tuple
from app.db.session import get_db_connection
from app.schemas.software import (
    SoftwareEnrollRequest,
    SoftwareResponse,
    SoftwareNodeResponse,
    SoftwareEnrollmentResult,
)
from app.services.detector_service import inspect_local_project_path
from app.services.ai_connector_service import ai_connector_service
from app.services.log_storage_service import log_storage_service


def generate_slug_id(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or f"software-{secrets.token_hex(4)}"


def generate_ingest_token() -> Tuple[str, str]:
    """Generates an unmasked nx_live_ secret and its SHA-256 hash"""
    raw_token = f"nx_live_{secrets.token_hex(20)}"
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash


def build_env_block(software_id: str, raw_token: str, backend_url: str = "http://localhost:8000") -> str:
    return f"""# Nexis Telemetry & Remediation Configuration
NEXIS_ENDPOINT="{backend_url}/api/v1/telemetry/events"
NEXIS_SOFTWARE_ID="{software_id}"
NEXIS_API_KEY="{raw_token}"
"""


class SoftwareFleetService:
    def list_all(self) -> List[SoftwareResponse]:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM softwares ORDER BY created_at DESC;")
            software_rows = cursor.fetchall()

            results = []
            for s in software_rows:
                cursor.execute(
                    "SELECT * FROM software_nodes WHERE software_id = ? ORDER BY created_at ASC;",
                    (s["id"],)
                )
                node_rows = cursor.fetchall()
                nodes = [
                    SoftwareNodeResponse(
                        id=n["id"],
                        software_id=n["software_id"],
                        name=n["name"],
                        node_type=n["node_type"],
                        endpoint_url=n["endpoint_url"],
                        health_status=n["health_status"],
                        created_at=n["created_at"],
                    )
                    for n in node_rows
                ]

                results.append(
                    SoftwareResponse(
                        id=s["id"],
                        name=s["name"],
                        category=s["category"],
                        platform=s["platform"],
                        local_repo_path=s["local_repo_path"],
                        repo_url=s["repo_url"] if "repo_url" in s.keys() else None,
                        target_url=s["target_url"],
                        provider=s["provider"] if "provider" in s.keys() else "custom",
                        provider_project_id=s["provider_project_id"] if "provider_project_id" in s.keys() else None,
                        description=s["description"],
                        status=s["status"],
                        health_score=s["health_score"],
                        created_at=s["created_at"],
                        updated_at=s["updated_at"],
                        nodes=nodes,
                    )
                )
            return results
        finally:
            conn.close()

    def get_by_id(self, software_id: str) -> Optional[SoftwareResponse]:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM softwares WHERE id = ?;", (software_id,))
            s = cursor.fetchone()
            if not s:
                return None

            cursor.execute("SELECT * FROM software_nodes WHERE software_id = ?;", (software_id,))
            nodes = [
                SoftwareNodeResponse(
                    id=n["id"],
                    software_id=n["software_id"],
                    name=n["name"],
                    node_type=n["node_type"],
                    endpoint_url=n["endpoint_url"],
                    health_status=n["health_status"],
                    created_at=n["created_at"],
                )
                for n in cursor.fetchall()
            ]

            return SoftwareResponse(
                id=s["id"],
                name=s["name"],
                category=s["category"],
                platform=s["platform"],
                local_repo_path=s["local_repo_path"],
                repo_url=s["repo_url"] if "repo_url" in s.keys() else None,
                target_url=s["target_url"],
                provider=s["provider"] if "provider" in s.keys() else "custom",
                provider_project_id=s["provider_project_id"] if "provider_project_id" in s.keys() else None,
                description=s["description"],
                status=s["status"],
                health_score=s["health_score"],
                created_at=s["created_at"],
                updated_at=s["updated_at"],
                nodes=nodes,
            )
        finally:
            conn.close()

    def enroll(self, req: SoftwareEnrollRequest, backend_url: str = "http://localhost:8000") -> SoftwareEnrollmentResult:
        """
        Validates path, detects platform if not provided, generates credentials,
        and atomically records the software and default ingress node.
        """
        inspection = inspect_local_project_path(req.local_repo_path)
        resolved_path = inspection["expanded_path"] if inspection["valid"] else req.local_repo_path
        platform = req.platform or inspection.get("platform_detected") or "Generic"
        category = req.category or inspection.get("category_suggested") or "Web API"
        repo_url = req.repo_url or inspection.get("git_remote_url") or None

        software_id = generate_slug_id(req.name)
        raw_token, token_hash = generate_ingest_token()
        node_id = f"node-{software_id}-ingress"

        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO softwares (
                        id, name, category, platform, local_repo_path, repo_url,
                        target_url, provider, provider_api_key, provider_project_id,
                        description, api_key_hash, status, health_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 100);
                    """,
                    (
                        software_id,
                        req.name.strip(),
                        category,
                        platform,
                        resolved_path,
                        repo_url,
                        req.target_url or "http://localhost:8000",
                        req.provider or "custom",
                        req.provider_api_key,
                        req.provider_project_id,
                        req.description or f"Enrolled application: {req.name}",
                        token_hash,
                    ),
                )

                # Initialize default ingress node
                conn.execute(
                    """
                    INSERT INTO software_nodes (
                        id, software_id, name, node_type, endpoint_url, health_status
                    ) VALUES (?, ?, ?, 'INGRESS', ?, 'HEALTHY');
                    """,
                    (
                        node_id,
                        software_id,
                        f"{req.name} Ingress Gateway",
                        req.target_url or "http://localhost:8000",
                    ),
                )
        except sqlite3.IntegrityError:
            # Suffix with random bytes if duplicate slug
            software_id = f"{software_id}-{secrets.token_hex(2)}"
            node_id = f"node-{software_id}-ingress"
            with conn:
                conn.execute(
                    """
                    INSERT INTO softwares (
                        id, name, category, platform, local_repo_path, repo_url,
                        target_url, provider, provider_api_key, provider_project_id,
                        description, api_key_hash, status, health_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 100);
                    """,
                    (
                        software_id,
                        req.name.strip(),
                        category,
                        platform,
                        resolved_path,
                        repo_url,
                        req.target_url or "http://localhost:8000",
                        req.provider or "custom",
                        req.provider_api_key,
                        req.provider_project_id,
                        req.description or f"Enrolled application: {req.name}",
                        token_hash,
                    ),
                )
                conn.execute(
                    """
                    INSERT INTO software_nodes (
                        id, software_id, name, node_type, endpoint_url, health_status
                    ) VALUES (?, ?, ?, 'INGRESS', ?, 'HEALTHY');
                    """,
                    (
                        node_id,
                        software_id,
                        f"{req.name} Ingress Gateway",
                        req.target_url or "http://localhost:8000",
                    ),
                )
                if getattr(req, "backend_url", None) and req.backend_url.strip():
                    conn.execute(
                        """
                        INSERT INTO software_nodes (
                            id, software_id, name, node_type, endpoint_url, health_status
                        ) VALUES (?, ?, ?, 'COMPUTE', ?, 'HEALTHY');
                        """,
                        (
                            f"node-{software_id}-compute",
                            software_id,
                            f"{req.name} Backend Compute API",
                            req.backend_url.strip(),
                        ),
                    )
        finally:
            conn.close()

        stored = self.get_by_id(software_id)
        if not stored:
            raise RuntimeError(f"Failed to fetch enrolled software record for {software_id}")

        env_block = build_env_block(software_id, raw_token, backend_url)

        # Generate Approach C Telemetry Connector into local repo
        connector_info = {}
        if getattr(req, "auto_generate_connector", True):
            try:
                connector_info = ai_connector_service.generate_and_install_connector(
                    software_id=software_id,
                    local_repo_path=resolved_path,
                    raw_token=raw_token,
                    platform_detected=platform,
                    backend_url=backend_url,
                )
            except Exception as e:
                connector_info = {"generated": False, "error": str(e)}

        # Seed initial system log entry
        try:
            conn_msg = (
                f"Generated {connector_info.get('file_name')} (Approach C telemetry shipper)."
                if connector_info.get("generated")
                else "Registered in SQLite."
            )
            log_storage_service.insert_log(
                system_id=f"{software_id}-ingress",
                software_id=software_id,
                message=f"Enrolled {req.name} into Nexis Fleet Control. {conn_msg}",
                level="INFO",
                tag="Nexis.Enrollment",
            )
        except Exception:
            pass

        return SoftwareEnrollmentResult(
            software=stored,
            api_key_raw=raw_token,
            env_block=env_block,
            connector_file_path=connector_info.get("file_path"),
            connector_file_name=connector_info.get("file_name"),
            connector_generated=connector_info.get("generated", False),
            connector_snippet=connector_info.get("snippet"),
            connector_instructions=connector_info.get("instructions"),
        )

    def delete(self, software_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute("DELETE FROM software_nodes WHERE software_id = ?;", (software_id,))
                try:
                    conn.execute("DELETE FROM telemetry_logs WHERE software_id = ?;", (software_id,))
                except Exception:
                    pass
                cursor = conn.execute("DELETE FROM softwares WHERE id = ?;", (software_id,))
                return cursor.rowcount > 0
        finally:
            conn.close()

    def delete_all(self) -> int:
        conn = get_db_connection()
        try:
            with conn:
                conn.execute("DELETE FROM software_nodes;")
                try:
                    conn.execute("DELETE FROM telemetry_logs;")
                except Exception:
                    pass
                cursor = conn.execute("DELETE FROM softwares;")
                return cursor.rowcount
        finally:
            conn.close()


software_fleet_service = SoftwareFleetService()
