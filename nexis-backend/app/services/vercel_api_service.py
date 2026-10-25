import os
import re
import asyncio
import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.config import settings
from app.services.log_storage_service import log_storage_service
from app.services.software_fleet_service import software_fleet_service

logger = logging.getLogger("nexis.vercel_api")


class VercelApiService:
    """
    Connects to Vercel's Free REST API using a personal access token.
    Fetches real project metadata, deployments, and build logs from api.vercel.com
    without requiring a Vercel Pro subscription.
    Dynamically profiles and syncs ANY launched or enrolled software in the fleet.
    """

    BASE_URL = "https://api.vercel.com"

    def __init__(self):
        self._sync_task: Optional[asyncio.Task] = None
        self._running = False

    def get_configured_token(self) -> Optional[str]:
        # Priority 1: VERCEL_API_KEY from .env / settings / os.environ
        token = (
            getattr(settings, "VERCEL_API_KEY", None)
            or os.environ.get("VERCEL_API_KEY")
            or getattr(settings, "VERCEL_API_TOKEN", None)
            or os.environ.get("VERCEL_API_TOKEN")
        )
        if token and str(token).strip():
            return str(token).strip()

        # Priority 2: Check enrolled software provider_api_key in SQLite
        try:
            for sw in software_fleet_service.list_all():
                if sw.provider == "vercel" and sw.provider_api_key:
                    return sw.provider_api_key.strip()
        except Exception:
            pass

        return None

    def get_configured_project(self) -> Optional[str]:
        val = (
            getattr(settings, "VERCEL_PROJECT_NAME", None)
            or os.environ.get("VERCEL_PROJECT_NAME", "")
        )
        return str(val).strip() if val else None

    async def fetch_projects(self, token: str) -> List[Dict[str, Any]]:
        headers = {
            "Authorization": f"Bearer {token.strip()}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.BASE_URL}/v9/projects", headers=headers)
            if resp.status_code != 200:
                logger.error(f"Failed to fetch Vercel projects: {resp.status_code} {resp.text}")
                return []
            data = resp.json()
            return data.get("projects", [])

    async def fetch_deployments(
        self,
        token: str,
        project_id: Optional[str] = None,
        team_id: Optional[str] = None,
        project_name: Optional[str] = None,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        headers = {
            "Authorization": f"Bearer {token.strip()}",
            "Content-Type": "application/json",
        }
        params: Dict[str, Any] = {"limit": limit}
        if project_id:
            params["projectId"] = project_id
        elif project_name:
            params["app"] = project_name

        if team_id:
            params["teamId"] = team_id

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.BASE_URL}/v6/deployments", headers=headers, params=params)
            if resp.status_code != 200:
                logger.error(f"Failed to fetch Vercel deployments: {resp.status_code} {resp.text}")
                return []
            data = resp.json()
            return data.get("deployments", [])

    async def fetch_deployment_events(
        self,
        token: str,
        deployment_id: str,
        team_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        headers = {
            "Authorization": f"Bearer {token.strip()}",
            "Content-Type": "application/json",
        }
        params: Dict[str, Any] = {}
        if team_id:
            params["teamId"] = team_id

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.BASE_URL}/v2/deployments/{deployment_id}/events",
                headers=headers,
                params=params,
            )
            if resp.status_code != 200:
                logger.error(f"Failed to fetch deployment events: {resp.status_code}")
                return []
            try:
                return resp.json()
            except Exception:
                return []

    async def fetch_user_events(
        self,
        token: str,
        limit: int = 40,
        team_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetches genuine user and team audit activity actions from Vercel /v2/events
        (e.g., deployments, git commits, alias creations, configuration changes, user interactions).
        """
        headers = {
            "Authorization": f"Bearer {token.strip()}",
            "Content-Type": "application/json",
        }
        params: Dict[str, Any] = {"limit": limit}
        if team_id:
            params["teamId"] = team_id

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self.BASE_URL}/v2/events", headers=headers, params=params)
            if resp.status_code != 200:
                logger.error(f"Failed to fetch Vercel user events: {resp.status_code} {resp.text}")
                return []
            try:
                data = resp.json()
                return data.get("events", [])
            except Exception:
                return []

    def find_matching_project(self, software: Any, projects: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Dynamically matches an enrolled software project against discovered Vercel projects
        using target_url subdomains, project slugs, names, or IDs.
        """
        sid = (software.id if hasattr(software, "id") else software.get("id", "")).lower()
        sname = (software.name if hasattr(software, "name") else software.get("name", "")).lower()
        turl = ((software.target_url if hasattr(software, "target_url") else software.get("target_url", "")) or "").lower()

        subdomain = ""
        if "vercel.app" in turl:
            cleaned_url = turl.replace("https://", "").replace("http://", "").split("/")[0]
            subdomain = cleaned_url.split(".vercel.app")[0].strip()

        for p in projects:
            pname = p.get("name", "").lower()
            if pname in {sid, sname, subdomain} and pname:
                return p
            if subdomain and (pname in subdomain or subdomain in pname):
                return p
            slug = re.sub(r"[^a-zA-Z0-9]+", "-", sname).strip("-")
            if pname == slug and pname:
                return p
            prod_url = p.get("targets", {}).get("production", {}).get("url", "").lower()
            if prod_url and (prod_url in turl or turl in prod_url):
                return p

        return None

    async def _sync_single_project(
        self,
        token: str,
        software_id: str,
        matched_project: Dict[str, Any],
        project_display_name: str,
    ) -> int:
        """
        Ingests deployment metadata and build log stream for a matched Vercel project into SQLite.
        """
        project_id = matched_project.get("id")
        team_id = (
            matched_project.get("teamId")
            or matched_project.get("targets", {}).get("production", {}).get("teamId")
        )
        target_name = matched_project.get("name") or project_display_name

        deployments = await self.fetch_deployments(
            token,
            project_id=project_id,
            team_id=team_id,
            project_name=target_name,
            limit=5,
        )

        if not deployments:
            return 0

        ingested = 0
        existing_logs = log_storage_service.query_logs(software_id=software_id, limit=500)
        existing_msgs = {l["msg"] for l in existing_logs}

        # Sync up to 3 recent deployments, prioritizing any error deployments
        for dep in deployments[:3]:
            uid = dep.get("uid") or dep.get("id")
            state = dep.get("state") or dep.get("readyState") or "READY"
            meta = dep.get("meta", {})
            commit_msg = meta.get("githubCommitMessage") or "Production deployment"
            author = meta.get("githubCommitAuthorName") or dep.get("creator", {}).get("username") or "Developer"
            url = dep.get("url") or f"{target_name}.vercel.app"

            # 1. Ingest deployment status event
            deploy_msg = (
                f"Vercel Deploy: State={state} - Commit: \"{commit_msg[:70]}\" "
                f"(by {author}) - URL: https://{url}"
            )
            if deploy_msg not in existing_msgs:
                level = "INFO" if state == "READY" else "WARN" if state == "BUILDING" else "ERROR"
                tag = "Vercel.Deploy" if state == "READY" else "Vercel.Error"
                log_storage_service.insert_log(
                    software_id=software_id,
                    system_id=f"{software_id}-ingress",
                    level=level,
                    tag=tag,
                    message=deploy_msg,
                    metadata={
                        "deploymentId": uid,
                        "url": url,
                        "commit": commit_msg,
                        "author": author,
                        "state": state,
                        "vercelProject": target_name,
                    },
                    timestamp=datetime.utcnow(),
                )
                ingested += 1
                existing_msgs.add(deploy_msg)

            # 2. Ingest real build & error events from this deployment
            if uid:
                events = await self.fetch_deployment_events(token, uid, team_id=team_id)
                for evt in events:
                    payload = evt.get("payload", {})
                    text = payload.get("text") or evt.get("text") or evt.get("message")
                    if not text or not str(text).strip():
                        continue

                    cleaned = str(text).strip()
                    if cleaned in existing_msgs:
                        continue

                    evt_type = evt.get("type", "stdout")
                    is_err = (
                        evt_type in ["stderr", "error"]
                        or "error" in cleaned.lower()
                        or "failed" in cleaned.lower()
                        or "rolluperror" in cleaned.lower()
                        or (state == "ERROR" and any(k in cleaned.lower() for k in ["syntax", "cannot find", "not exported", "exception"]))
                    )
                    level = "ERROR" if is_err else "INFO"
                    tag = "Vercel.Error" if is_err else "Vercel.Build"

                    meta_payload: Dict[str, Any] = {
                        **evt,
                        "vercelProject": target_name,
                        "deploymentId": uid,
                    }

                    # Extract file and line number if present
                    file_match = re.search(
                        r'(?:file:\s+|in\s+|at\s+)?([a-zA-Z0-9_\-\.\/]+\.(?:jsx?|tsx?|py|vue|html)):(\d+)',
                        cleaned,
                    )
                    if file_match:
                        raw_file = file_match.group(1).replace("/vercel/path0/", "")
                        raw_line = int(file_match.group(2))
                        meta_payload["filePath"] = raw_file
                        meta_payload["lineNumber"] = raw_line

                    log_storage_service.insert_log(
                        software_id=software_id,
                        system_id=f"{software_id}-compute",
                        level=level,
                        tag=tag,
                        message=cleaned,
                        stack_trace=cleaned if is_err else None,
                        metadata=meta_payload,
                        timestamp=datetime.utcnow(),
                    )
                    ingested += 1
                    existing_msgs.add(cleaned)

        return ingested

    async def sync_all_systems(self, token: Optional[str] = None) -> Dict[str, Any]:
        """
        Polls Vercel's REST API across ALL enrolled software fleet targets,
        discovering corresponding Vercel projects and ingesting build steps,
        deployment lifecycle, and edge logs dynamically into SQLite.
        """
        active_token = (token or self.get_configured_token() or "").strip()
        if not active_token:
            return {"status": "error", "message": "No Vercel API token configured."}

        projects = await self.fetch_projects(active_token)
        if not projects:
            return {"status": "error", "message": "Failed to fetch Vercel projects or no projects found."}

        softwares = software_fleet_service.list_all()
        synced_results = []
        total_ingested = 0

        for sw in softwares:
            matched_p = self.find_matching_project(sw, projects)
            if matched_p:
                count = await self._sync_single_project(
                    token=active_token,
                    software_id=sw.id,
                    matched_project=matched_p,
                    project_display_name=sw.name,
                )
                synced_results.append({
                    "software_id": sw.id,
                    "software_name": sw.name,
                    "vercel_project": matched_p.get("name"),
                    "events_ingested": count,
                })
                total_ingested += count

        # Ingest genuine user and team audit activity actions across Vercel projects
        try:
            user_events = await self.fetch_user_events(active_token, limit=40)
            existing_logs = log_storage_service.query_logs(limit=500)
            existing_msgs = {l["msg"] for l in existing_logs}

            for uev in user_events:
                text = uev.get("text")
                if not text:
                    continue
                cleaned = str(text).strip()
                if cleaned in existing_msgs:
                    continue

                user_info = uev.get("user", {}) or uev.get("principal", {})
                username = user_info.get("username") or user_info.get("email") or "Developer"
                ev_type = uev.get("type", "user_action")
                created_ts = uev.get("createdAt") or uev.get("created")

                # Map event to software by project name or entities
                matched_sw_id = None
                for sw in softwares:
                    sw_name_lower = sw.name.lower()
                    sw_id_lower = sw.id.lower()
                    if sw_name_lower in cleaned.lower() or sw_id_lower in cleaned.lower():
                        matched_sw_id = sw.id
                        break
                    for ent in uev.get("entities", []):
                        ent_val = str(ent.get("host") or ent.get("url") or "").lower()
                        if sw.target_url and sw.target_url.lower() in ent_val:
                            matched_sw_id = sw.id
                            break

                target_software_id = matched_sw_id or (softwares[0].id if softwares else "shulebase-86e8")

                ts_dt = datetime.utcfromtimestamp(created_ts / 1000) if created_ts else datetime.utcnow()
                vercel_msg = f"Vercel Audit [{username}]: {cleaned}"

                log_storage_service.insert_log(
                    software_id=target_software_id,
                    system_id=f"{target_software_id}-ingress",
                    level="INFO",
                    tag="Vercel.Audit",
                    message=vercel_msg,
                    metadata={
                        "user": username,
                        "action_type": ev_type,
                        "vercel_event_id": uev.get("id"),
                        "raw_text": cleaned,
                        "source": "vercel_api_audit",
                    },
                    timestamp=ts_dt,
                )
                total_ingested += 1
                existing_msgs.add(cleaned)
        except Exception as e:
            logger.error(f"Error syncing Vercel user audit actions: {e}")

        logger.info(
            f"Vercel multi-tenant sync complete: {total_ingested} events across {len(synced_results)} systems."
        )
        return {
            "status": "success",
            "total_ingested": total_ingested,
            "synced_systems": synced_results,
            "available_vercel_projects": [p.get("name") for p in projects],
        }

    async def sync_project_logs(
        self,
        token: Optional[str] = None,
        software_id: Optional[str] = None,
        project_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Syncs Vercel logs for a specific software project or all systems if software_id is 'all' or empty.
        """
        active_token = (token or self.get_configured_token() or "").strip()
        if not active_token:
            return {"status": "error", "message": "No Vercel API token configured."}

        if not software_id or software_id.lower() == "all":
            return await self.sync_all_systems(token=active_token)

        projects = await self.fetch_projects(active_token)
        if not projects:
            return {"status": "error", "message": "Failed to fetch Vercel projects."}

        # Locate software in fleet
        software = software_fleet_service.get_by_id(software_id)
        matched_project = None

        if project_name:
            for p in projects:
                if p.get("name", "").lower() == project_name.lower():
                    matched_project = p
                    break

        if not matched_project and software:
            matched_project = self.find_matching_project(software, projects)

        if not matched_project:
            for p in projects:
                if p.get("name", "").lower() == software_id.lower():
                    matched_project = p
                    break

        if not matched_project:
            return {
                "status": "error",
                "message": f"No Vercel project found matching software '{software_id}' or project '{project_name}'.",
                "available_vercel_projects": [p.get("name") for p in projects],
            }

        count = await self._sync_single_project(
            token=active_token,
            software_id=software_id,
            matched_project=matched_project,
            project_display_name=software.name if software else software_id,
        )

        # Ingest user action events for this project
        user_actions_count = 0
        try:
            user_events = await self.fetch_user_events(active_token, limit=30)
            existing_logs = log_storage_service.query_logs(software_id=software_id, limit=300)
            existing_msgs = {l["msg"] for l in existing_logs}
            pname = matched_project.get("name", "").lower()

            for uev in user_events:
                text = uev.get("text")
                if not text:
                    continue
                cleaned = str(text).strip()
                if cleaned in existing_msgs:
                    continue

                if pname in cleaned.lower() or (software and software.name.lower() in cleaned.lower()):
                    user_info = uev.get("user", {}) or uev.get("principal", {})
                    username = user_info.get("username") or user_info.get("email") or "Developer"
                    ev_type = uev.get("type", "user_action")
                    created_ts = uev.get("createdAt") or uev.get("created")
                    ts_dt = datetime.utcfromtimestamp(created_ts / 1000) if created_ts else datetime.utcnow()
                    vercel_msg = f"Vercel Audit [{username}]: {cleaned}"

                    log_storage_service.insert_log(
                        software_id=software_id,
                        system_id=f"{software_id}-ingress",
                        level="INFO",
                        tag="Vercel.Audit",
                        message=vercel_msg,
                        metadata={
                            "user": username,
                            "action_type": ev_type,
                            "vercel_event_id": uev.get("id"),
                            "raw_text": cleaned,
                            "source": "vercel_api_audit",
                        },
                        timestamp=ts_dt,
                    )
                    user_actions_count += 1
                    existing_msgs.add(cleaned)
        except Exception as e:
            logger.error(f"Error syncing project user audit actions: {e}")

        return {
            "status": "success",
            "software_id": software_id,
            "vercel_project": matched_project.get("name"),
            "ingested_count": count + user_actions_count,
            "user_actions_ingested": user_actions_count,
        }

    async def _loop(self, interval_seconds: int = 60):
        while self._running:
            try:
                token = self.get_configured_token()
                if token:
                    await self.sync_all_systems(token=token)
            except Exception as e:
                logger.error(f"Error in Vercel background sync loop: {e}")

            await asyncio.sleep(interval_seconds)

    def start_background_sync(self, interval_seconds: int = 60):
        if self._running:
            return
        self._running = True
        self._sync_task = asyncio.create_task(self._loop(interval_seconds))

    def stop_background_sync(self):
        self._running = False
        if self._sync_task and not self._sync_task.done():
            self._sync_task.cancel()


vercel_api_service = VercelApiService()
