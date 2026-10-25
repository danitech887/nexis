import asyncio
import time
import random
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import httpx

from app.services.software_fleet_service import software_fleet_service
from app.services.log_storage_service import log_storage_service

logger = logging.getLogger("nexis.prober")


class LiveIngressProberService:
    """
    Actively probes enrolled softwares' target_urls, measuring latency,
    edge response codes, TLS handshakes, and Vercel CDN headers.
    Ingests genuine live events into SQLite in real-time.
    """

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def probe_software(self, software_id: str) -> Optional[Dict[str, Any]]:
        software = software_fleet_service.get_by_id(software_id)
        if not software or not software.target_url:
            return None

        raw_url = software.target_url.strip()
        url = raw_url if raw_url.startswith(("http://", "https://")) else f"https://{raw_url}"

        t0 = time.time()
        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(
                    url,
                    headers={"User-Agent": "Nexis-Telemetry-Prober/1.0 (+https://nexis.internal)"}
                )
                latency_ms = max(1, int((time.time() - t0) * 1000))

                server = resp.headers.get("server", "Web Server")
                vercel_id = resp.headers.get("x-vercel-id")
                cache_status = resp.headers.get("x-vercel-cache") or resp.headers.get("cf-cache-status") or "DIRECT"
                status_code = resp.status_code

                is_ok = 200 <= status_code < 400
                level = "INFO"
                tag = "Vercel.Edge" if "vercel" in server.lower() or vercel_id else "HTTP.Ingress"
                if not is_ok:
                    level = "ERROR" if status_code >= 400 else "WARN"
                    if status_code >= 400:
                        tag = "HTTP.Error"
                elif latency_ms > 1000:
                    level = "WARN"

                edge_info = f" [edge: {vercel_id.split('::')[0] if vercel_id else server}, cache: {cache_status}]"
                message = f"GET {url} -> {status_code} ({latency_ms}ms){edge_info}"

                log_storage_service.insert_log(
                    software_id=software_id,
                    system_id=f"{software_id}-ingress",
                    level=level,
                    tag=tag,
                    message=message,
                    metadata={
                        "target_url": url,
                        "status_code": status_code,
                        "latency_ms": latency_ms,
                        "server": server,
                        "vercel_id": vercel_id,
                        "cache_status": cache_status,
                    },
                    timestamp=datetime.utcnow(),
                )

                return {
                    "software_id": software_id,
                    "url": url,
                    "status_code": status_code,
                    "latency_ms": latency_ms,
                    "level": level,
                    "message": message,
                }
        except httpx.RequestError as exc:
            latency_ms = max(1, int((time.time() - t0) * 1000))
            err_msg = f"GET {url} -> UNREACHABLE ({exc.__class__.__name__}) after {latency_ms}ms"
            log_storage_service.insert_log(
                software_id=software_id,
                system_id=f"{software_id}-ingress",
                level="ERROR",
                tag="Ingress.Timeout",
                message=err_msg,
                metadata={"target_url": url, "error": str(exc)},
                timestamp=datetime.utcnow(),
            )
            return {
                "software_id": software_id,
                "url": url,
                "status_code": 0,
                "latency_ms": latency_ms,
                "level": "ERROR",
                "message": err_msg,
            }

    async def _loop(self, interval_seconds: int = 15):
        logger.info(f"Starting Live Ingress Prober (poll interval: {interval_seconds}s)...")
        while self._running:
            try:
                softwares = software_fleet_service.list_all()
                for s in softwares:
                    if s.target_url:
                        await self.probe_software(s.id)
            except Exception as e:
                logger.error(f"Error in Live Ingress Prober loop: {e}")

            await asyncio.sleep(interval_seconds)

    def start(self, interval_seconds: int = 15):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._loop(interval_seconds))

    def stop(self):
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()


live_ingress_prober = LiveIngressProberService()
