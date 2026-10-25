from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, Body, HTTPException, Request, Response
from app.core.security import validate_api_key
from app.schemas.telemetry import (
    TelemetryEvent,
    TelemetryBatch,
    TelemetryIngestResponse,
)
from app.services.log_storage_service import log_storage_service
from app.services.local_log_watcher import local_log_watcher

router = APIRouter()


@router.post("/events", response_model=TelemetryIngestResponse)
async def ingest_single_event(
    event: TelemetryEvent,
    _auth: str = Depends(validate_api_key)
):
    # Determine parent software_id accurately
    software_id = event.software_id
    if not software_id:
        if ":" in event.system_id:
            software_id = event.system_id.split(":")[0]
        elif event.system_id.endswith("-ingress"):
            software_id = event.system_id[:-len("-ingress")]
        elif event.system_id.endswith("-frontend"):
            software_id = event.system_id[:-len("-frontend")]
        elif event.system_id.endswith("-backend"):
            software_id = event.system_id[:-len("-backend")]
        else:
            software_id = event.system_id

    row_id = log_storage_service.insert_log(
        system_id=event.system_id,
        software_id=software_id,
        message=event.message,
        level=event.level,
        tag=event.tag,
        stack_trace=event.stack_trace,
        metadata=event.metadata,
        timestamp=event.timestamp,
    )

    return TelemetryIngestResponse(
        status="accepted",
        ingested_count=1,
        system_id=event.system_id,
    )


@router.post("/batch", response_model=TelemetryIngestResponse)
async def ingest_batch_events(
    batch: TelemetryBatch,
    _auth: str = Depends(validate_api_key)
):
    """
    High-throughput bulk ingestion endpoint for SDKs and background log forwarders.
    """
    count = 0
    for evt in batch.events:
        log_storage_service.insert_log(
            system_id=evt.system_id or batch.system_id,
            software_id=batch.system_id,
            message=evt.message,
            level=evt.level,
            tag=evt.tag,
            stack_trace=evt.stack_trace,
            metadata=evt.metadata,
            timestamp=evt.timestamp,
        )
        count += 1

    return TelemetryIngestResponse(
        status="accepted",
        ingested_count=count,
        system_id=batch.system_id,
    )


@router.get("/events")
async def list_logs(
    software_id: Optional[str] = Query(None, description="Filter by software slug"),
    system_id: Optional[str] = Query(None, description="Filter by system/subsystem ID"),
    level: Optional[str] = Query(None, description="Filter by log level (INFO, WARN, ERROR, DEBUG, TRACE)"),
    search: Optional[str] = Query(None, description="Search keyword in message or tag"),
    limit: int = Query(100, le=500),
    since_id: Optional[int] = Query(None, description="Only logs with ID greater than this (for stream polling)"),
):
    """
    Queries real-time persistent logs from SQLite matching filter criteria.
    If software_id has local on-disk log files, parses and auto-ingests new lines.
    """
    if software_id:
        try:
            local_log_watcher.scan_and_ingest_software_logs(software_id)
        except Exception:
            pass

    logs = log_storage_service.query_logs(
        software_id=software_id,
        system_id=system_id,
        level=level,
        search=search,
        limit=limit,
        since_id=since_id,
    )

    # If no logs exist yet for an active software with target_url, execute an immediate live probe
    if not logs and software_id:
        try:
            from app.services.prober_service import live_ingress_prober
            probe_result = await live_ingress_prober.probe_software(software_id)
            if probe_result:
                logs = log_storage_service.query_logs(
                    software_id=software_id,
                    system_id=system_id,
                    level=level,
                    search=search,
                    limit=limit,
                    since_id=since_id,
                )
        except Exception:
            pass

    return {
        "total": len(logs),
        "software_id": software_id,
        "system_id": system_id,
        "events": logs,
    }


@router.delete("/events")
async def clear_logs_endpoint(
    software_id: Optional[str] = Query(None),
    system_id: Optional[str] = Query(None),
):
    """
    Clears logs for a specific software or subsystem.
    """
    deleted = log_storage_service.clear_logs(software_id=software_id, system_id=system_id)
    return {"deleted": deleted}


@router.api_route("/vercel-drain/{software_id}", methods=["GET", "POST"])
@router.api_route("/vercel-drain", methods=["GET", "POST"])
async def handle_vercel_log_drain(
    request: Request,
    response: Response,
    software_id: Optional[str] = None,
):
    """
    Vercel Log Drain ingestion endpoint.
    Accepts Vercel's HTTP Log Drain webhook payloads (JSON array or NDJSON)
    and maps Edge and Lambda runtime logs to SQLite telemetry logs.
    """
    import json
    from datetime import datetime

    # Echo back Vercel challenge header during setup
    vercel_verify = request.headers.get("x-vercel-verify")
    if vercel_verify:
        response.headers["x-vercel-verify"] = vercel_verify

    if request.method == "GET":
        return {
            "status": "ok",
            "service": "Nexis Vercel Log Drain Receiver",
            "target_software": software_id or "default",
        }

    body_bytes = await request.body()
    if not body_bytes:
        return {"status": "accepted", "ingested": 0}

    raw_text = body_bytes.decode("utf-8", errors="replace").strip()
    events = []

    if raw_text.startswith("["):
        try:
            events = json.loads(raw_text)
        except Exception:
            pass
    else:
        for line in raw_text.splitlines():
            line = line.strip()
            if line:
                try:
                    events.append(json.loads(line))
                except Exception:
                    pass

    target_software = software_id or "shulebase"
    ingested = 0

    for evt in events:
        if not isinstance(evt, dict):
            continue

        message = evt.get("message")
        proxy = evt.get("proxy")
        status_code = evt.get("statusCode")

        if not message and proxy and isinstance(proxy, dict):
            status_code = proxy.get("statusCode", 200)
            method = proxy.get("method", "GET")
            path = proxy.get("path", "/")
            message = f"{method} {path} -> {status_code}"

        if not message:
            message = json.dumps(evt)

        # Detect log level
        level = "INFO"
        evt_type = str(evt.get("type", "")).lower()
        if evt_type == "stderr" or (status_code and status_code >= 500):
            level = "ERROR"
        elif status_code and status_code >= 400:
            level = "WARN"

        # Map to subsystem
        source = str(evt.get("source", "lambda")).lower()
        if source in ["edge", "static", "external"] or proxy:
            system_id = f"{target_software}-ingress"
            tag = f"Vercel.{source.capitalize()}"
        else:
            system_id = f"{target_software}-compute"
            tag = f"Vercel.{source.capitalize()}"

        # Parse timestamp if present
        ts = None
        raw_ts = evt.get("timestamp")
        if raw_ts:
            try:
                if isinstance(raw_ts, (int, float)):
                    ts = datetime.utcfromtimestamp(raw_ts / 1000.0 if raw_ts > 1e11 else raw_ts)
            except Exception:
                ts = None

        log_storage_service.insert_log(
            software_id=target_software,
            system_id=system_id,
            level=level,
            tag=tag,
            message=message,
            stack_trace=evt.get("stackTrace"),
            metadata=evt,
            timestamp=ts or datetime.utcnow(),
        )
        ingested += 1

    return {"status": "accepted", "ingested": ingested}


@router.post("/vercel-sync")
async def sync_vercel_api_logs(
    payload: Optional[Dict[str, Any]] = Body(default=None)
):
    """
    Free Vercel API Ingestion:
    Uses a free Vercel Personal Access Token to pull live deployments and
    build logs from api.vercel.com into SQLite for any launched system or the entire fleet.
    """
    from app.services.vercel_api_service import vercel_api_service

    body = payload or {}
    token = (body.get("token") or vercel_api_service.get_configured_token() or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing Vercel personal access token")

    software_id = body.get("software_id")
    project_name = body.get("project_name")

    if not software_id or software_id.lower() == "all":
        res = await vercel_api_service.sync_all_systems(token=token)
    else:
        res = await vercel_api_service.sync_project_logs(
            token=token,
            software_id=software_id,
            project_name=project_name,
        )
    return res


@router.get("/tracker.js")
async def get_browser_tracker_script(
    request: Request,
    id: Optional[str] = Query(None, description="Software ID slug"),
    key: Optional[str] = Query(None, description="API Key"),
):
    """
    Universal Zero-Configuration Browser Telemetry Tracker.
    Inject via a simple <script> tag into any frontend web application
    (React, Next.js, Vue, Svelte, Django templates, plain HTML, WordPress).

    Automatically captures:
    - Real-time SPA Route Navigation (pushState, replaceState, popstate, direct page loads)
    - User Interactions (Clicks on buttons, links, forms with element details & context)
    - Uncaught Browser JavaScript Exceptions & Unhandled Promise Rejections (with stack traces)
    - Network / Fetch errors
    """
    default_id = id or "shulebase"
    default_key = key or ""
    host = request.headers.get("host", "localhost:8000")
    scheme = "https" if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https" else "http"
    default_endpoint = f"{scheme}://{host}/api/v1/telemetry/events"

    tracker_code = f"""/**
 * Nexis Universal Real-User Telemetry Tracker v1.2
 * Autonomous Fleet Observability Engine
 */
(function() {{
  if (window.__NEXIS_TRACKER_INITIALIZED__) return;
  window.__NEXIS_TRACKER_INITIALIZED__ = true;

  var currentScript = document.currentScript;
  var scriptUrl = currentScript ? new URL(currentScript.src, window.location.href) : null;
  var softwareId = (currentScript && currentScript.getAttribute('data-software-id')) ||
                   (scriptUrl && scriptUrl.searchParams.get('id')) ||
                   window.NEXIS_SOFTWARE_ID ||
                   "{default_id}";
  var apiKey = (currentScript && currentScript.getAttribute('data-api-key')) ||
               (scriptUrl && scriptUrl.searchParams.get('key')) ||
               window.NEXIS_API_KEY ||
               "{default_key}";
  var endpoint = (currentScript && currentScript.getAttribute('data-endpoint')) ||
                 (scriptUrl && scriptUrl.searchParams.get('endpoint')) ||
                 window.NEXIS_ENDPOINT ||
                 "{default_endpoint}";

  var breadcrumbs = [];
  function recordBreadcrumb(type, text) {{
    try {{
      breadcrumbs.push({{
        type: type,
        text: String(text).slice(0, 120),
        url: window.location.pathname,
        time: new Date().toISOString()
      }});
      if (breadcrumbs.length > 20) breadcrumbs.shift();
    }} catch (e) {{}}
  }}

  function dispatchTelemetry(level, tag, message, metadata, stackTrace) {{
    try {{
      var payload = {{
        software_id: softwareId,
        system_id: softwareId + '-frontend',
        message: message,
        level: level || 'INFO',
        tag: tag || 'User.Action',
        stack_trace: stackTrace || null,
        metadata: Object.assign({{
          url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          title: document.title,
          referrer: document.referrer || null,
          viewport: window.innerWidth + 'x' + window.innerHeight,
          breadcrumbs: breadcrumbs.slice(-6)
        }}, metadata || {{}}),
        timestamp: new Date().toISOString()
      }};

      var body = JSON.stringify(payload);
      var urlWithAuth = endpoint + (apiKey ? (endpoint.indexOf('?') === -1 ? '?key=' : '&key=') + encodeURIComponent(apiKey) : '');

      if (window.fetch) {{
        fetch(urlWithAuth, {{
          method: 'POST',
          headers: {{
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          }},
          body: body,
          keepalive: true,
          mode: 'cors'
        }}).catch(function() {{}});
      }} else if (navigator.sendBeacon) {{
        var blob = new Blob([body], {{ type: 'application/json' }});
        navigator.sendBeacon(urlWithAuth, blob);
      }}
    }} catch (e) {{
      // Silent catch so tracker never interrupts host application
    }}
  }}

  // 1. Initial Page View / Navigation
  recordBreadcrumb('nav', window.location.pathname);
  dispatchTelemetry('INFO', 'User.Navigation', 'User entered ' + window.location.pathname, {{
    action: 'page_load',
    initial: true
  }});

  // 2. Client-side Navigation (SPA pushState & popstate)
  var originalPushState = history.pushState;
  if (originalPushState) {{
    history.pushState = function() {{
      var res = originalPushState.apply(this, arguments);
      recordBreadcrumb('nav', window.location.pathname);
      dispatchTelemetry('INFO', 'User.Navigation', 'User navigated to ' + window.location.pathname + window.location.search, {{
        action: 'spa_push_state'
      }});
      return res;
    }};
  }}

  var originalReplaceState = history.replaceState;
  if (originalReplaceState) {{
    history.replaceState = function() {{
      var res = originalReplaceState.apply(this, arguments);
      recordBreadcrumb('nav', window.location.pathname);
      dispatchTelemetry('INFO', 'User.Navigation', 'User route replaced to ' + window.location.pathname + window.location.search, {{
        action: 'spa_replace_state'
      }});
      return res;
    }};
  }}

  window.addEventListener('popstate', function() {{
    recordBreadcrumb('nav', window.location.pathname);
    dispatchTelemetry('INFO', 'User.Navigation', 'User navigated back/forward to ' + window.location.pathname, {{
      action: 'spa_pop_state'
    }});
  }});

  // 3. User Click & Form Interactions
  document.addEventListener('click', function(e) {{
    try {{
      var el = e.target && (e.target.closest('button, a, input[type="submit"], input[type="button"], [role="button"]') || e.target);
      if (!el || !el.tagName) return;
      var tag = el.tagName.toLowerCase();
      var isInteractive = tag === 'button' || tag === 'a' || tag === 'input' || el.getAttribute('role') === 'button';
      if (!isInteractive) return;

      var label = (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('name') || el.id || '').trim().replace(/\\s+/g, ' ').slice(0, 50);
      var text = label ? ' "' + label + '"' : '';
      var href = el.getAttribute('href') ? ' -> ' + el.getAttribute('href') : '';
      var msg = 'User clicked ' + tag + text + href + ' on ' + window.location.pathname;

      recordBreadcrumb('click', tag + (label ? ' "' + label + '"' : ''));
      dispatchTelemetry('INFO', 'User.Interaction', msg, {{
        target: tag,
        label: label,
        href: el.getAttribute('href') || null,
        className: (el.className || '').toString().slice(0, 80)
      }});
    }} catch (err) {{}}
  }}, true);

  // 4. API Request & Network Error Interceptor (fetch)
  var originalFetch = window.fetch;
  if (originalFetch) {{
    window.fetch = function(input, init) {{
      var t0 = Date.now();
      var method = ((init && init.method) || (typeof input === 'object' && input && input.method) || 'GET').toUpperCase();
      var rawUrl = typeof input === 'string' ? input : (input && input.url) || '';

      // Skip telemetry self-calls
      if (rawUrl && (rawUrl.indexOf('/api/v1/telemetry') !== -1 || rawUrl.indexOf('localhost:8000') !== -1)) {{
        return originalFetch.apply(this, arguments);
      }}

      return originalFetch.apply(this, arguments).then(function(response) {{
        var duration = Date.now() - t0;
        var shortUrl = rawUrl.split('?')[0];
        if (!response.ok) {{
          // HTTP 4xx or 5xx triggered by user interaction!
          recordBreadcrumb('api_err', method + ' ' + shortUrl + ' -> ' + response.status);
          dispatchTelemetry(
            response.status >= 500 ? 'ERROR' : 'WARN',
            'User.ActionError',
            'API Failure: ' + method + ' ' + shortUrl + ' -> ' + response.status + ' ' + response.statusText + ' (Triggered on ' + window.location.pathname + ')',
            {{
              method: method,
              url: rawUrl,
              status: response.status,
              statusText: response.statusText,
              duration_ms: duration,
              trigger_page: window.location.pathname
            }}
          );
        }} else {{
          recordBreadcrumb('api_ok', method + ' ' + shortUrl + ' -> ' + response.status);
          dispatchTelemetry(
            'INFO',
            'User.Action',
            method + ' ' + shortUrl + ' -> ' + response.status + ' (' + duration + 'ms)',
            {{
              method: method,
              url: rawUrl,
              status: response.status,
              duration_ms: duration
            }}
          );
        }}
        return response;
      }}).catch(function(err) {{
        var duration = Date.now() - t0;
        var shortUrl = rawUrl.split('?')[0];
        recordBreadcrumb('net_err', method + ' ' + shortUrl + ' -> ' + (err.message || 'failed'));
        dispatchTelemetry(
          'ERROR',
          'User.NetworkError',
          'Network Request Failed: ' + method + ' ' + shortUrl + ' (' + (err.message || 'Connection Refused') + ') on ' + window.location.pathname,
          {{
            method: method,
            url: rawUrl,
            error: err.message,
            duration_ms: duration
          }}
        );
        throw err;
      }});
    }};
  }}

  // 5. Console Error Interceptor
  var origConsoleError = console.error;
  if (origConsoleError) {{
    console.error = function() {{
      try {{
        var args = Array.prototype.slice.call(arguments);
        var msg = args.map(function(a) {{ return typeof a === 'object' ? JSON.stringify(a) : String(a); }}).join(' ');
        if (msg.indexOf('[Nexis]') === -1) {{
          recordBreadcrumb('console_err', msg.slice(0, 60));
          dispatchTelemetry('ERROR', 'Console.Error', 'Console Error on ' + window.location.pathname + ': ' + msg.slice(0, 300), {{
            raw: msg.slice(0, 400)
          }});
        }}
      }} catch (ce) {{}}
      origConsoleError.apply(console, arguments);
    }};
  }}

  // 6. Global Uncaught Exceptions & Rejections
  window.addEventListener('error', function(e) {{
    recordBreadcrumb('crash', e.message || 'Script error');
    dispatchTelemetry('ERROR', 'User.Crash', 'Uncaught Runtime Error: ' + (e.message || 'Script error') + ' on ' + window.location.pathname, {{
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno
    }}, e.error ? e.error.stack : null);
  }});

  window.addEventListener('unhandledrejection', function(e) {{
    var reason = e.reason;
    var msg = (reason && (reason.message || reason.toString())) || 'Unhandled promise rejection';
    recordBreadcrumb('reject', msg.slice(0, 60));
    dispatchTelemetry('ERROR', 'User.PromiseReject', 'Unhandled Promise Rejection: ' + msg + ' on ' + window.location.pathname, {{}}, reason && reason.stack ? reason.stack : null);
  }});

  // Expose global Nexis helper object
  window.nexis = {{
    log: function(msg, opts) {{
      opts = opts || {{}};
      dispatchTelemetry(opts.level || 'INFO', opts.tag || 'User.Action', msg, opts.metadata, opts.stackTrace);
    }},
    track: function(actionName, metadata) {{
      recordBreadcrumb('custom_action', actionName);
      dispatchTelemetry('INFO', 'User.Action', 'User action: ' + actionName, metadata);
    }},
    identify: function(userId, metadata) {{
      recordBreadcrumb('identify', userId);
      dispatchTelemetry('INFO', 'User.Identify', 'User identified as [' + userId + ']', Object.assign({{ userId: userId }}, metadata || {{}}));
    }}
  }};

  console.info('[Nexis] Real User Observability active for "' + softwareId + '" -> streaming to ' + endpoint);
}})();
"""
    return Response(
        content=tracker_code,
        media_type="application/javascript",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        }
    )

