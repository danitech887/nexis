import os
import glob
import logging
from typing import Dict, Any, Optional
from app.services.detector_service import inspect_local_project_path

logger = logging.getLogger("nexis.ai_connector")


def _generate_django_connector(software_id: str, raw_token: str, backend_url: str) -> str:
    return f'''"""
Nexis Telemetry Connector for Django / Python Applications
Generated automatically by Nexis Autonomous Fleet Orchestrator (Approach C).

This connector ships logs and uncaught runtime exceptions directly to Nexis
via asynchronous, non-blocking HTTP requests. It works across any cloud provider,
PaaS (Render, Vercel, Railway, AWS, Docker), or local machine without paid log drains.
"""

import sys
import os
import json
import logging
import threading
import urllib.request
import urllib.error
import traceback
from datetime import datetime

# Nexis Configuration
NEXIS_ENDPOINT = os.environ.get("NEXIS_ENDPOINT", "{backend_url}/api/v1/telemetry/events")
NEXIS_SOFTWARE_ID = os.environ.get("NEXIS_SOFTWARE_ID", "{software_id}")
NEXIS_API_KEY = os.environ.get("NEXIS_API_KEY", "{raw_token}")


def _post_telemetry_async(payload: dict, sync: bool = False):
    """Dispatches payload to Nexis in a thread so application request latency is unaffected."""
    def _worker():
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                NEXIS_ENDPOINT,
                data=data,
                headers={{
                    "Content-Type": "application/json",
                    "X-API-Key": NEXIS_API_KEY,
                    "User-Agent": "Nexis-Client-Telemetry/1.0",
                }},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5.0) as resp:
                pass
        except Exception:
            # Silent fallback so logging never breaks application execution
            pass

    t = threading.Thread(target=_worker, daemon=not sync)
    t.start()
    if sync:
        t.join(timeout=6.0)


class NexisLogHandler(logging.Handler):
    """
    Standard Python logging.Handler to capture application logs (INFO, WARN, ERROR)
    and forward them directly to the Nexis Fleet Control panel.
    """
    def emit(self, record):
        try:
            stack = ""
            if record.exc_info:
                stack = "".join(traceback.format_exception(*record.exc_info))

            payload = {{
                "software_id": NEXIS_SOFTWARE_ID,
                "system_id": f"{{NEXIS_SOFTWARE_ID}}-backend",
                "message": record.getMessage(),
                "level": record.levelname.upper(),
                "tag": record.name,
                "stack_trace": stack or None,
                "metadata": {{
                    "module": record.module,
                    "filename": record.filename,
                    "lineno": record.lineno,
                }},
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }}
            _post_telemetry_async(payload)
        except Exception:
            self.handleError(record)


class NexisDjangoMiddleware:
    """
    Django middleware to automatically track user requests, 500 errors, and uncaught exceptions.
    Add 'nexis_telemetry.NexisDjangoMiddleware' to MIDDLEWARE in settings.py.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import time
        t0 = time.time()
        response = self.get_response(request)
        duration_ms = max(1, int((time.time() - t0) * 1000))

        # Identify active user
        user_id = "anonymous"
        if hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
            user_id = str(request.user)

        # Skip automated internal health probe pings from flooding user activity logs
        if not request.path.endswith("/health/") and not request.path.endswith("/health"):
            level = "ERROR" if response.status_code >= 500 else ("WARN" if response.status_code >= 400 else "INFO")
            is_user_action = request.method in ["POST", "PUT", "PATCH", "DELETE"] or user_id != "anonymous"
            tag = "User.Action" if is_user_action else "HTTP.Request"

            payload = {{
                "software_id": NEXIS_SOFTWARE_ID,
                "system_id": f"{{NEXIS_SOFTWARE_ID}}-backend",
                "message": f"[{{user_id}}] {{request.method}} {{request.path}} -> {{response.status_code}} ({{duration_ms}}ms)",
                "level": level,
                "tag": tag,
                "metadata": {{
                    "user": user_id,
                    "method": request.method,
                    "path": request.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "ip": request.META.get("REMOTE_ADDR", ""),
                    "user_agent": request.META.get("HTTP_USER_AGENT", "Unknown")[:80],
                }},
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }}
            _post_telemetry_async(payload)
        return response

    def process_exception(self, request, exception):
        stack = traceback.format_exc()
        user_id = "anonymous"
        if hasattr(request, "user") and getattr(request.user, "is_authenticated", False):
            user_id = str(request.user)

        payload = {{
            "software_id": NEXIS_SOFTWARE_ID,
            "system_id": f"{{NEXIS_SOFTWARE_ID}}-backend",
            "message": f"Uncaught {{type(exception).__name__}} for [{{user_id}}]: {{str(exception)}} on {{request.path}}",
            "level": "CRITICAL",
            "tag": "User.Crash",
            "stack_trace": stack,
            "metadata": {{
                "user": user_id,
                "method": request.method,
                "path": request.path,
                "exception_type": type(exception).__name__,
            }},
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }}
        _post_telemetry_async(payload)
        return None


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Nexis Telemetry Self-Test")
    parser.add_argument("--test", action="store_true", help="Send a test ping to Nexis")
    args = parser.parse_args()

    print(f"Connecting to Nexis Endpoint: {{NEXIS_ENDPOINT}}")
    print(f"Software ID: {{NEXIS_SOFTWARE_ID}}")
    payload = {{
        "software_id": NEXIS_SOFTWARE_ID,
        "system_id": f"{{NEXIS_SOFTWARE_ID}}-backend",
        "message": "Manual test heartbeat verified from nexis_telemetry.py",
        "level": "INFO",
        "tag": "Nexis.SelfTest",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }}
    _post_telemetry_async(payload, sync=True)
    print("Telemetry event dispatched successfully to Nexis.")
'''


def _generate_node_typescript_connector(software_id: str, raw_token: str, backend_url: str) -> str:
    return f'''/**
 * Nexis Telemetry Connector for Node.js / Next.js / TypeScript Applications
 * Generated automatically by Nexis Autonomous Fleet Orchestrator (Approach C).
 *
 * Captures console errors, uncaught promise rejections, and browser/server exceptions
 * and ships them directly to Nexis via non-blocking HTTP requests.
 */

const NEXIS_ENDPOINT = process.env.NEXT_PUBLIC_NEXIS_ENDPOINT ||
  process.env.NEXIS_ENDPOINT ||
  "{backend_url}/api/v1/telemetry/events";

const NEXIS_SOFTWARE_ID = process.env.NEXT_PUBLIC_NEXIS_SOFTWARE_ID ||
  process.env.NEXIS_SOFTWARE_ID ||
  "{software_id}";

const NEXIS_API_KEY = process.env.NEXT_PUBLIC_NEXIS_API_KEY ||
  process.env.NEXIS_API_KEY ||
  "{raw_token}";

export interface NexisLogOptions {{
  level?: "INFO" | "WARN" | "ERROR" | "DEBUG" | "CRITICAL";
  tag?: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}}

export async function nexisLog(message: string, options: NexisLogOptions = {{}}): Promise<void> {{
  const level = options.level || "INFO";
  const tag = options.tag || "application";

  const payload = {{
    software_id: NEXIS_SOFTWARE_ID,
    system_id: `${{NEXIS_SOFTWARE_ID}}-frontend`,
    message,
    level,
    tag,
    stack_trace: options.stackTrace || null,
    metadata: options.metadata || {{}},
    timestamp: new Date().toISOString(),
  }};

  try {{
    if (typeof window !== "undefined" && window.fetch) {{
      // Browser environment: use keepalive for safe delivery
      fetch(NEXIS_ENDPOINT, {{
        method: "POST",
        headers: {{
          "Content-Type": "application/json",
          "X-API-Key": NEXIS_API_KEY,
        }},
        body: JSON.stringify(payload),
        keepalive: true,
      }}).catch(() => {{}});
    }} else {{
      // Node.js environment
      const https = await import(NEXIS_ENDPOINT.startsWith("https") ? "https" : "http");
      const url = new URL(NEXIS_ENDPOINT);
      const data = JSON.stringify(payload);

      const req = https.request(url, {{
        method: "POST",
        headers: {{
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          "X-API-Key": NEXIS_API_KEY,
        }},
      }});
      req.on("error", () => {{}});
      req.write(data);
      req.end();
    }}
  }} catch {{
    // Non-blocking catch
  }}
}}

// Active user identification
let activeUserId: string = "anonymous";
let activeUserMetadata: Record<string, unknown> = {{}};

export function nexisIdentifyUser(userId: string, metadata: Record<string, unknown> = {{}}): void {{
  activeUserId = userId;
  activeUserMetadata = metadata;
  nexisLog(`User session identified as [${{userId}}]`, {{
    level: "INFO",
    tag: "User.Identify",
    metadata: {{ userId, ...metadata }},
  }});
}}

export function nexisTrackAction(actionName: string, metadata: Record<string, unknown> = {{}}): void {{
  nexisLog(`User action: ${{actionName}}`, {{
    level: "INFO",
    tag: "User.Action",
    metadata: {{ user: activeUserId, ...metadata }},
  }});
}}

// Initialize global crash and Real User Monitoring (RUM) interceptors
export function initNexisTelemetry(): void {{
  if (typeof window !== "undefined") {{
    // 1. Uncaught Browser Exceptions
    window.addEventListener("error", (event) => {{
      nexisLog(`Uncaught Browser Error: ${{event.message}}`, {{
        level: "ERROR",
        tag: "User.Crash",
        stackTrace: event.error?.stack,
        metadata: {{
          user: activeUserId,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          url: window.location.href,
        }},
      }});
    }});

    window.addEventListener("unhandledrejection", (event) => {{
      nexisLog(`Unhandled Promise Rejection: ${{event.reason?.message || event.reason}}`, {{
        level: "ERROR",
        tag: "User.PromiseReject",
        stackTrace: event.reason?.stack,
        metadata: {{ user: activeUserId, url: window.location.href }},
      }});
    }});

    // 2. Real User Navigation (SPA Route Changes)
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {{
      originalPushState.apply(this, args);
      try {{
        const path = window.location.pathname + window.location.search;
        nexisLog(`User navigated to ${{path}}`, {{
          level: "INFO",
          tag: "User.Navigation",
          metadata: {{ user: activeUserId, path, title: document.title }},
        }});
      }} catch (e) {{ /* ignore */ }}
    }};

    window.addEventListener("popstate", () => {{
      try {{
        const path = window.location.pathname + window.location.search;
        nexisLog(`User navigated (history) to ${{path}}`, {{
          level: "INFO",
          tag: "User.Navigation",
          metadata: {{ user: activeUserId, path, title: document.title }},
        }});
      }} catch (e) {{ /* ignore */ }}
    }});

    // 3. User Click & Interaction Tracking
    window.addEventListener(
      "click",
      (event) => {{
        try {{
          const target = (event.target as HTMLElement)?.closest("button, a, [role='button'], input[type='submit']");
          if (target) {{
            const el = target as HTMLElement;
            const label = el.innerText?.trim().slice(0, 40) || el.getAttribute("aria-label") || el.getAttribute("name") || el.tagName.toLowerCase();
            const targetType = el.tagName.toLowerCase();
            nexisLog(`User clicked ${{targetType}} "${{label}}" on ${{window.location.pathname}}`, {{
              level: "INFO",
              tag: "User.Interaction",
              metadata: {{
                user: activeUserId,
                element: targetType,
                label,
                path: window.location.pathname,
                id: el.id || null,
              }},
            }});
          }}
        }} catch (e) {{ /* ignore */ }}
      }},
      {{ capture: true }}
    );

    // 4. Form Submit Tracking
    window.addEventListener(
      "submit",
      (event) => {{
        try {{
          const form = event.target as HTMLFormElement;
          const formId = form.id || form.name || form.action || "form";
          nexisLog(`User submitted form "${{formId}}" on ${{window.location.pathname}}`, {{
            level: "INFO",
            tag: "User.FormSubmit",
            metadata: {{ user: activeUserId, formId, path: window.location.pathname }},
          }});
        }} catch (e) {{ /* ignore */ }}
      }},
      {{ capture: true }}
    );
  }} else if (typeof process !== "undefined") {{
    process.on("uncaughtException", (err) => {{
      nexisLog(`Uncaught Node Exception: ${{err.message}}`, {{
        level: "CRITICAL",
        tag: "node.uncaughtException",
        stackTrace: err.stack,
      }});
    }});

    process.on("unhandledRejection", (reason: any) => {{
      nexisLog(`Unhandled Node Promise Rejection: ${{reason?.message || reason}}`, {{
        level: "ERROR",
        tag: "node.unhandledRejection",
        stackTrace: reason?.stack,
      }});
    }});
  }}
}}

// Auto-run if imported
if (typeof window !== "undefined" || typeof process !== "undefined") {{
  initNexisTelemetry();
}}
'''


def _generate_kotlin_android_connector(software_id: str, raw_token: str, backend_url: str) -> str:
    return f'''/**
 * Nexis Telemetry Connector for Android / Kotlin Applications
 * Generated automatically by Nexis Autonomous Fleet Orchestrator (Approach C).
 */

package com.nexis.telemetry

import android.content.Context
import android.os.Build
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors

object NexisTelemetry {{
    private const val NEXIS_ENDPOINT = "{backend_url}/api/v1/telemetry/events"
    private const val NEXIS_SOFTWARE_ID = "{software_id}"
    private const val NEXIS_API_KEY = "{raw_token}"

    private val executor = Executors.newSingleThreadExecutor()

    fun init(context: Context) {{
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler {{ thread, throwable ->
            log(
                message = "Fatal Crash in ${{thread.name}}: ${{throwable.localizedMessage}}",
                level = "CRITICAL",
                tag = "AndroidCrashHandler",
                stackTrace = throwable.stackTraceToString()
            )
            defaultHandler?.uncaughtException(thread, throwable)
        }}
        log("Nexis Mobile Telemetry initialized on Android device", "INFO", "Nexis.Init")
    }}

    fun log(message: String, level: String = "INFO", tag: String = "MobileApp", stackTrace: String? = null) {{
        executor.execute {{
            try {{
                val url = URL(NEXIS_ENDPOINT)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("X-API-Key", NEXIS_API_KEY)
                conn.connectTimeout = 3000
                conn.readTimeout = 3000
                conn.doOutput = true

                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                sdf.timeZone = TimeZone.getTimeZone("UTC")

                val payload = JSONObject().apply {{
                    put("software_id", NEXIS_SOFTWARE_ID)
                    put("system_id", "$NEXIS_SOFTWARE_ID-mobile")
                    put("message", message)
                    put("level", level)
                    put("tag", tag)
                    if (stackTrace != null) put("stack_trace", stackTrace)
                    put("timestamp", sdf.format(Date()))
                    val meta = JSONObject().apply {{
                        put("device", Build.MODEL)
                        put("os_version", Build.VERSION.RELEASE)
                    }}
                    put("metadata", meta)
                }}

                val writer = OutputStreamWriter(conn.outputStream)
                writer.write(payload.toString())
                writer.flush()
                writer.close()
                conn.responseCode // execute request
            }} catch (e: Exception) {{
                // Silent fail
            }}
        }}
    }}
}}
'''


class AiConnectorService:
    def generate_and_install_connector(
        self,
        software_id: str,
        local_repo_path: str,
        raw_token: str,
        platform_detected: str,
        backend_url: str = "http://localhost:8000",
    ) -> Dict[str, Any]:
        """
        Analyzes the target repository stack, generates the tailored Approach C
        telemetry connector, and writes it directly into the target project on disk.
        """
        abs_path = os.path.abspath(os.path.expanduser(local_repo_path.strip()))
        if not os.path.exists(abs_path):
            return {
                "generated": False,
                "error": f"Repository path does not exist: {abs_path}",
                "file_path": None,
                "file_name": None,
            }

        # Find best directory to place the connector (e.g. backend subfolder if monorepo)
        target_dir = abs_path
        entries = os.listdir(abs_path)

        # Check for mono-repo structure
        for sub in ["backend", "server", "api", "src"]:
            sub_path = os.path.join(abs_path, sub)
            if os.path.isdir(sub_path):
                sub_entries = os.listdir(sub_path)
                if "manage.py" in sub_entries or "package.json" in sub_entries or "requirements.txt" in sub_entries:
                    target_dir = sub_path
                    break

        platform_lower = platform_detected.lower()

        # Generate based on detected platform
        if "django" in platform_lower or "python" in platform_lower or any(f.endswith(".py") for f in entries):
            file_name = "nexis_telemetry.py"
            file_content = _generate_django_connector(software_id, raw_token, backend_url)
            instructions = (
                f"Connector written to {file_name}. In Django settings.py, add "
                f"'nexis_telemetry.NexisDjangoMiddleware' to MIDDLEWARE and attach "
                f"'nexis_telemetry.NexisLogHandler' to LOGGING handlers."
            )
        elif "android" in platform_lower or "kotlin" in platform_lower:
            file_name = "NexisTelemetry.kt"
            file_content = _generate_kotlin_android_connector(software_id, raw_token, backend_url)
            instructions = f"Connector written to {file_name}. Call 'NexisTelemetry.init(context)' in Application.onCreate()."
        elif "react" in platform_lower or "next" in platform_lower or "typescript" in platform_lower or "node" in platform_lower:
            file_name = "nexis-telemetry.ts"
            file_content = _generate_node_typescript_connector(software_id, raw_token, backend_url)
            instructions = f"Connector written to {file_name}. Import and call 'initNexisTelemetry()' in your app entrypoint."
        else:
            # Universal Python fallback
            file_name = "nexis_telemetry.py"
            file_content = _generate_django_connector(software_id, raw_token, backend_url)
            instructions = f"Connector written to {file_name}. Import and use NexisLogHandler."

        full_file_path = os.path.join(target_dir, file_name)

        html_injected_path = None
        # Auto-detect frontend index.html files across the repository to enable zero-config browser telemetry
        html_candidates = glob.glob(os.path.join(abs_path, "**", "index.html"), recursive=True)
        for hpath in html_candidates:
            if "node_modules" in hpath or ".git" in hpath:
                continue
            try:
                with open(hpath, "r", encoding="utf-8") as hf:
                    html_content = hf.read()
                
                script_tag = f'<script src="{backend_url}/api/v1/telemetry/tracker.js?id={software_id}" async></script>'
                if "tracker.js" not in html_content:
                    if "</head>" in html_content:
                        updated_html = html_content.replace(
                            "</head>",
                            f"    <!-- Nexis Real User Telemetry Tracker -->\n    {script_tag}\n</head>"
                        )
                    elif "</body>" in html_content:
                        updated_html = html_content.replace(
                            "</body>",
                            f"    <!-- Nexis Real User Telemetry Tracker -->\n    {script_tag}\n</body>"
                        )
                    else:
                        updated_html = html_content + f"\n{script_tag}\n"

                    with open(hpath, "w", encoding="utf-8") as hf:
                        hf.write(updated_html)
                    html_injected_path = hpath
                    logger.info(f"Auto-injected Nexis tracker.js script tag into {hpath}")
                    break
            except Exception as he:
                logger.warning(f"Could not inject tracker tag into {hpath}: {he}")

        try:
            with open(full_file_path, "w", encoding="utf-8") as f:
                f.write(file_content)

            # Also write .env.nexis for easy credentials loading
            env_file_path = os.path.join(target_dir, ".env.nexis")
            with open(env_file_path, "w", encoding="utf-8") as f:
                f.write(f"""# Nexis Telemetry Configuration (Approach C)
NEXIS_ENDPOINT="{backend_url}/api/v1/telemetry/events"
NEXIS_SOFTWARE_ID="{software_id}"
NEXIS_API_KEY="{raw_token}"
""")

            logger.info(f"Successfully generated and wrote {file_name} into {target_dir}")
            return {
                "generated": True,
                "file_name": file_name,
                "file_path": full_file_path,
                "env_file_path": env_file_path,
                "snippet": file_content[:300] + "\n...",
                "instructions": instructions,
                "html_injected": bool(html_injected_path),
                "html_injected_path": html_injected_path,
                "browser_script_tag": f'<script src="{backend_url}/api/v1/telemetry/tracker.js?id={software_id}" async></script>',
            }
        except Exception as e:
            logger.error(f"Failed to write connector file: {str(e)}")
            return {
                "generated": False,
                "error": f"Failed to write connector file: {str(e)}",
                "file_path": None,
                "file_name": file_name,
                "html_injected": bool(html_injected_path),
                "html_injected_path": html_injected_path,
            }


ai_connector_service = AiConnectorService()
