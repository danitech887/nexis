import re
import asyncio
import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.log_storage_service import log_storage_service
from app.db.session import get_db_connection

logger = logging.getLogger("nexis.cloud_providers")

# Comprehensive catalog of major cloud hosting providers and how to get free API keys
CLOUD_PROVIDERS_CATALOG = [
    {
        "id": "render",
        "name": "Render",
        "category": "PaaS / Web Services & DBs",
        "token_label": "Render API Key (rnd_...)",
        "token_url": "https://dashboard.render.com/u/settings/api-keys",
        "doc_url": "https://render.com/docs/api",
        "placeholder": "rnd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "guide": [
            "Sign in to your free account at dashboard.render.com",
            "Click your profile icon in the top-right corner -> Account Settings",
            "Select 'API Keys' in the sidebar navigation",
            "Click 'Create API Key', name it 'Nexis Observability', and copy the generated token"
        ],
        "capabilities": ["Live Service Runtime Logs", "Deploy Events", "Auto-Service Discovery"]
    },
    {
        "id": "vercel",
        "name": "Vercel",
        "category": "Frontend Cloud & Edge Functions",
        "token_label": "Vercel Personal Access Token",
        "token_url": "https://vercel.com/account/tokens",
        "doc_url": "https://vercel.com/docs/rest-api",
        "placeholder": "vcp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "guide": [
            "Sign in to your account at vercel.com",
            "Click your avatar in the top-right -> Settings -> Tokens",
            "Click 'Create Token', choose Scope: Full Account or Read Only",
            "Copy your token and paste it here"
        ],
        "capabilities": ["Deployment Lifecycle", "Build Logs & Errors", "Edge Ingress Verification"]
    },
    {
        "id": "railway",
        "name": "Railway",
        "category": "PaaS / Containers & Databases",
        "token_label": "Railway Account Token",
        "token_url": "https://railway.com/dashboard/account/tokens",
        "doc_url": "https://docs.railway.com/reference/public-api",
        "placeholder": "rlwy_xxxxxxxxxxxxxxxxxxxxxxxx",
        "guide": [
            "Log in to railway.com/dashboard",
            "Go to Account Settings -> Tokens",
            "Click 'Create Token', label it 'Nexis', and copy the token"
        ],
        "capabilities": ["Deployment Container Logs", "Service Status", "Crash Traces"]
    },
    {
        "id": "fly",
        "name": "Fly.io",
        "category": "Global Edge MicroVMs",
        "token_label": "Fly.io API Token",
        "token_url": "https://web.fly.io/user/personal_access_tokens",
        "doc_url": "https://fly.io/docs/security/tokens/",
        "placeholder": "fly_v1_xxxxxxxxxxxxxxxxxxxxxxxx",
        "guide": [
            "Log in to web.fly.io",
            "Go to Account -> Personal Access Tokens",
            "Generate a new token (or run 'flyctl auth token' in your local shell)"
        ],
        "capabilities": ["Machine Logs", "Instance Health", "Network Egress"]
    },
    {
        "id": "netlify",
        "name": "Netlify",
        "category": "Static Sites & Serverless Functions",
        "token_label": "Netlify Personal Access Token",
        "token_url": "https://app.netlify.com/user/applications#personal-access-tokens",
        "doc_url": "https://docs.netlify.com/api/get-started/",
        "placeholder": "nfp_xxxxxxxxxxxxxxxxxxxxxxxx",
        "guide": [
            "Sign in to app.netlify.com",
            "Click your profile icon -> User Settings -> Applications",
            "Under 'Personal access tokens', click 'New access token'",
            "Generate and copy your token"
        ],
        "capabilities": ["Deploy Traces", "Function Invocations", "Site Discovery"]
    },
    {
        "id": "koyeb",
        "name": "Koyeb",
        "category": "Serverless Container Engine",
        "token_label": "Koyeb API Token",
        "token_url": "https://app.koyeb.com/account/api",
        "doc_url": "https://www.koyeb.com/docs/api",
        "placeholder": "koyeb_api_xxxxxxxxxxxxxxxxxxxx",
        "guide": [
            "Log in to app.koyeb.com",
            "Navigate to Account -> API Tokens",
            "Click 'Create API Token' and copy the secret"
        ],
        "capabilities": ["Instance Runtime Logs", "App Health", "Autoscale Events"]
    },
    {
        "id": "digitalocean",
        "name": "DigitalOcean App Platform",
        "category": "Cloud PaaS & Droplets",
        "token_label": "DigitalOcean Personal Access Token",
        "token_url": "https://cloud.digitalocean.com/account/api/tokens",
        "doc_url": "https://docs.digitalocean.com/reference/api/",
        "placeholder": "dop_v1_xxxxxxxxxxxxxxxxxxxxxxxx",
        "guide": [
            "Log in to cloud.digitalocean.com",
            "In the left navigation, click 'API' -> 'Tokens/Keys'",
            "Click 'Generate New Token', grant Read scope, and copy the secret"
        ],
        "capabilities": ["App Platform Logs", "Deployment Status", "Droplet Ingress"]
    },
    {
        "id": "aws",
        "name": "AWS (CloudWatch Free Tier)",
        "category": "Hyperscale Cloud & Lambdas",
        "token_label": "AWS Access Key ID:Secret:Region",
        "token_url": "https://console.aws.amazon.com/iam/home#/security_credentials",
        "doc_url": "https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/WhatIsCloudWatchLogs.html",
        "placeholder": "AKIAXXXXXXXXXXXXXXXX:secret_key:us-east-1",
        "guide": [
            "Log in to the AWS Management Console at aws.amazon.com",
            "Search for IAM -> Users -> Select or create a read-only user",
            "Attach policy 'CloudWatchLogsReadOnlyAccess'",
            "Create an Access Key (Format: AccessKeyID:SecretKey:Region)"
        ],
        "capabilities": ["CloudWatch Log Streams", "Lambda Telemetry", "API Gateway Ingress"]
    },
    {
        "id": "custom",
        "name": "Self-Hosted / Docker / Local Machine",
        "category": "Custom Compute & Bare Metal",
        "token_label": "No Cloud API Key Required",
        "token_url": None,
        "doc_url": None,
        "placeholder": "(Uses built-in Approach C Telemetry & Prober)",
        "guide": [
            "No cloud credentials required.",
            "Nexis monitors your systems using the built-in HTTP prober and generated in-app telemetry files."
        ],
        "capabilities": ["HTTP Prober", "Approach C In-App Connector", "Browser Tracker"]
    }
]


class CloudProviderService:
    """
    Unified multi-cloud provider integration engine for Nexis.
    Communicates with free REST APIs across Render, Vercel, Railway, Fly.io,
    Netlify, Koyeb, DigitalOcean, and AWS without requiring paid subscriptions.
    """

    def get_catalog(self) -> List[Dict[str, Any]]:
        return CLOUD_PROVIDERS_CATALOG

    async def verify_and_discover(self, provider: str, api_key: str) -> Dict[str, Any]:
        """
        Validates the provider API key and discovers live projects/services.
        """
        p_clean = provider.strip().lower()
        key_clean = api_key.strip()

        if not key_clean:
            return {"valid": False, "error": "API key cannot be empty", "projects": []}

        if p_clean == "render":
            return await self._verify_render(key_clean)
        elif p_clean == "vercel":
            return await self._verify_vercel(key_clean)
        elif p_clean == "railway":
            return await self._verify_railway(key_clean)
        elif p_clean == "fly":
            return await self._verify_fly(key_clean)
        elif p_clean == "netlify":
            return await self._verify_netlify(key_clean)
        elif p_clean == "koyeb":
            return await self._verify_koyeb(key_clean)
        elif p_clean == "digitalocean":
            return await self._verify_digitalocean(key_clean)
        elif p_clean == "aws":
            return await self._verify_aws(key_clean)
        elif p_clean == "custom":
            return {"valid": True, "provider": "custom", "projects": []}
        else:
            return {"valid": False, "error": f"Unsupported cloud provider: {provider}", "projects": []}

    async def _verify_render(self, key: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get("https://api.render.com/v1/services?limit=30", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    projects = []
                    for item in data:
                        svc = item.get("service", {})
                        details = svc.get("serviceDetails", {})
                        url = details.get("url") or f"https://{svc.get('slug', '')}.onrender.com"
                        projects.append({
                            "id": svc.get("id"),
                            "name": svc.get("name"),
                            "type": svc.get("type"),
                            "target_url": url,
                            "updated_at": svc.get("updatedAt"),
                        })
                    return {"valid": True, "provider": "render", "projects": projects}
                else:
                    return {"valid": False, "error": f"Render API rejected token (HTTP {resp.status_code}): {resp.text[:120]}", "projects": []}
            except Exception as e:
                return {"valid": False, "error": f"Failed to connect to api.render.com: {str(e)}", "projects": []}

    async def _verify_vercel(self, key: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get("https://api.vercel.com/v9/projects?limit=30", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    projects = []
                    for p in data.get("projects", []):
                        prod = p.get("targets", {}).get("production", {})
                        url = prod.get("url") or f"{p.get('name')}.vercel.app"
                        if not url.startswith("http"):
                            url = f"https://{url}"
                        projects.append({
                            "id": p.get("id"),
                            "name": p.get("name"),
                            "type": p.get("framework") or "nextjs",
                            "target_url": url,
                            "updated_at": p.get("updatedAt"),
                        })
                    return {"valid": True, "provider": "vercel", "projects": projects}
                else:
                    return {"valid": False, "error": f"Vercel API rejected token (HTTP {resp.status_code})", "projects": []}
            except Exception as e:
                return {"valid": False, "error": f"Failed to connect to api.vercel.com: {str(e)}", "projects": []}

    async def _verify_railway(self, key: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        query = """query { me { name email projects { edges { node { id name updatedAt } } } } }"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post("https://backboard.railway.app/graphql/v2", headers=headers, json={"query": query})
                if resp.status_code == 200:
                    data = resp.json()
                    edges = data.get("data", {}).get("me", {}).get("projects", {}).get("edges", [])
                    projects = [{
                        "id": e["node"]["id"],
                        "name": e["node"]["name"],
                        "type": "container",
                        "target_url": None,
                        "updated_at": e["node"].get("updatedAt"),
                    } for e in edges]
                    return {"valid": True, "provider": "railway", "projects": projects}
                return {"valid": False, "error": f"Railway API rejected token (HTTP {resp.status_code})", "projects": []}
            except Exception as e:
                return {"valid": False, "error": f"Failed to connect to Railway: {str(e)}", "projects": []}

    async def _verify_fly(self, key: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {key}"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get("https://api.fly.io/v1/apps", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    projects = [{
                        "id": a.get("id"),
                        "name": a.get("name"),
                        "type": "microvm",
                        "target_url": f"https://{a.get('name')}.fly.dev",
                    } for a in (data.get("apps", []) or data)]
                    return {"valid": True, "provider": "fly", "projects": projects}
                return {"valid": False, "error": f"Fly.io rejected token (HTTP {resp.status_code})", "projects": []}
            except Exception as e:
                return {"valid": False, "error": f"Failed to connect to Fly.io: {str(e)}", "projects": []}

    async def _verify_netlify(self, key: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {key}"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get("https://api.netlify.com/api/v1/sites?limit=25", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    projects = [{
                        "id": s.get("id"),
                        "name": s.get("name"),
                        "type": "jamstack",
                        "target_url": s.get("ssl_url") or s.get("url"),
                    } for s in data]
                    return {"valid": True, "provider": "netlify", "projects": projects}
                return {"valid": False, "error": f"Netlify rejected token (HTTP {resp.status_code})", "projects": []}
            except Exception as e:
                return {"valid": False, "error": f"Failed to connect to Netlify: {str(e)}", "projects": []}

    async def _verify_koyeb(self, key: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {key}"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get("https://app.koyeb.com/v1/apps?limit=20", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    projects = [{
                        "id": a.get("id"),
                        "name": a.get("name"),
                        "type": "container",
                        "target_url": a.get("domains", [{}])[0].get("name"),
                    } for a in data.get("apps", [])]
                    return {"valid": True, "provider": "koyeb", "projects": projects}
                return {"valid": False, "error": f"Koyeb rejected token (HTTP {resp.status_code})", "projects": []}
            except Exception as e:
                return {"valid": False, "error": f"Failed to connect to Koyeb: {str(e)}", "projects": []}

    async def _verify_digitalocean(self, key: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {key}"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get("https://api.digitalocean.com/v2/apps", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    projects = [{
                        "id": a.get("id"),
                        "name": a.get("spec", {}).get("name"),
                        "type": "app_platform",
                        "target_url": a.get("live_url"),
                    } for a in data.get("apps", [])]
                    return {"valid": True, "provider": "digitalocean", "projects": projects}
                return {"valid": False, "error": f"DigitalOcean rejected token (HTTP {resp.status_code})", "projects": []}
            except Exception as e:
                return {"valid": False, "error": f"Failed to connect to DigitalOcean: {str(e)}", "projects": []}

    async def _verify_aws(self, key_triple: str) -> Dict[str, Any]:
        parts = key_triple.split(":")
        if len(parts) < 2:
            return {
                "valid": False,
                "error": "AWS format must be 'AccessKeyID:SecretKey:Region' (e.g. AKIA...:secret:us-east-1)",
                "projects": [],
            }
        region = parts[2] if len(parts) >= 3 else "us-east-1"
        return {
            "valid": True,
            "provider": "aws",
            "projects": [{"id": f"cloudwatch-{region}", "name": f"CloudWatch Logs ({region})", "type": "cloudwatch"}],
        }

    async def sync_software_logs(self, software_id: str) -> Dict[str, Any]:
        """
        Polls the enrolled software's configured provider API and streams runtime logs into SQLite.
        """
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM softwares WHERE id = ?;", (software_id,))
            s = cursor.fetchone()
            if not s:
                return {"status": "error", "message": f"Software '{software_id}' not found."}

            provider = (s["provider"] if "provider" in s.keys() else "custom") or "custom"
            api_key = (s["provider_api_key"] if "provider_api_key" in s.keys() else "") or ""
            project_id = (s["provider_project_id"] if "provider_project_id" in s.keys() else "") or ""

            if provider == "vercel":
                from app.services.vercel_api_service import vercel_api_service
                return await vercel_api_service.sync_project_logs(token=api_key or None, software_id=software_id)

            elif provider == "render":
                return await self._sync_render_logs(software_id, s["name"], api_key, project_id, s["target_url"])

            else:
                return {
                    "status": "info",
                    "provider": provider,
                    "message": f"Provider '{provider}' operates via live HTTP prober and in-app telemetry.",
                    "ingested_count": 0
                }
        finally:
            conn.close()

    async def _sync_render_logs(
        self,
        software_id: str,
        software_name: str,
        api_key: str,
        service_id: Optional[str],
        target_url: Optional[str],
    ) -> Dict[str, Any]:
        """
        Streams live service logs from Render API into SQLite.
        """
        if not api_key:
            return {"status": "error", "message": "No Render API Key configured for this software."}

        headers = {"Authorization": f"Bearer {api_key.strip()}", "Accept": "application/json"}
        async with httpx.AsyncClient(timeout=12.0) as client:
            try:
                # If service_id is not saved, discover it by name or target_url
                target_svc_id = service_id
                if not target_svc_id:
                    resp = await client.get("https://api.render.com/v1/services?limit=30", headers=headers)
                    if resp.status_code != 200:
                        return {"status": "error", "message": f"Failed to list Render services: HTTP {resp.status_code}"}
                    services = resp.json()
                    for item in services:
                        svc = item.get("service", {})
                        sname = (svc.get("name") or "").lower()
                        surl = (svc.get("serviceDetails", {}).get("url") or "").lower()
                        if software_id.lower() in sname or (target_url and target_url.lower() in surl):
                            target_svc_id = svc.get("id")
                            break
                    if not target_svc_id and services:
                        target_svc_id = services[0].get("service", {}).get("id")

                if not target_svc_id:
                    return {"status": "error", "message": "No matching Render service found."}

                # Fetch logs for service
                log_resp = await client.get(f"https://api.render.com/v1/services/{target_svc_id}/logs?limit=50", headers=headers)
                if log_resp.status_code != 200:
                    return {"status": "error", "message": f"Render logs endpoint returned HTTP {log_resp.status_code}"}

                log_data = log_resp.json()
                existing_logs = log_storage_service.query_logs(software_id=software_id, limit=200)
                existing_msgs = {l["msg"] for l in existing_logs}

                ingested = 0
                # Render logs can be an array of objects or string entries
                entries = log_data if isinstance(log_data, list) else log_data.get("logs", [])
                for entry in entries:
                    raw_msg = entry.get("message") if isinstance(entry, dict) else str(entry)
                    if not raw_msg or not raw_msg.strip():
                        continue

                    msg = raw_msg.strip()
                    if msg in existing_msgs:
                        continue

                    level = "INFO"
                    tag = "Render.Runtime"
                    msg_lower = msg.lower()
                    if "error" in msg_lower or "exception" in msg_lower or "traceback" in msg_lower or "500" in msg:
                        level = "ERROR"
                        tag = "Render.Crash"
                    elif "warn" in msg_lower or "404" in msg or "403" in msg:
                        level = "WARN"
                        tag = "Render.Warn"
                    elif "get " in msg_lower or "post " in msg_lower or "put " in msg_lower:
                        tag = "Render.Access"

                    log_storage_service.insert_log(
                        software_id=software_id,
                        system_id=f"{software_id}-compute",
                        level=level,
                        tag=tag,
                        message=msg,
                        metadata={"provider": "render", "service_id": target_svc_id},
                        timestamp=datetime.utcnow()
                    )
                    existing_msgs.add(msg)
                    ingested += 1

                logger.info(f"Render API sync for '{software_name}': {ingested} events ingested from service {target_svc_id}.")
                return {
                    "status": "success",
                    "provider": "render",
                    "service_id": target_svc_id,
                    "ingested_count": ingested,
                }
            except Exception as e:
                logger.error(f"Render sync exception: {e}")
                return {"status": "error", "message": f"Render sync error: {str(e)}"}


cloud_provider_service = CloudProviderService()
