"use client";

import { useEffect } from "react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Sends a self-monitoring telemetry event from Nexis to its own backend.
 * Uses fire-and-forget fetch to ensure zero impact on UI performance.
 */
export function sendSelfTelemetry(
  level: "INFO" | "WARN" | "ERROR" | "DEBUG" = "INFO",
  tag: string = "Nexis.Self",
  message: string = "",
  metadata: Record<string, any> = {}
) {
  if (typeof window === "undefined") return;

  try {
    fetch(`${BACKEND_URL}/api/v1/telemetry/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_id: "nexis-ingress",
        software_id: "nexis",
        level,
        tag,
        message,
        metadata,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Fail silently if backend is briefly restarting
    });
  } catch {
    // Fail silently in production
  }
}

/**
 * React hook / component to initialize Nexis self-monitoring:
 * - Page navigation tracking
 * - Global uncaught exceptions
 * - Unhandled Promise rejections
 */
export function NexisSelfTelemetryListener() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Initial Session mount
    const initialPath = window.location.pathname || "/";
    sendSelfTelemetry(
      "INFO",
      "Nexis.Session",
      `Nexis Autonomous Radar HUD active at ${initialPath}`
    );

    // 2. Navigation interception
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      try {
        const path = window.location.pathname + window.location.search;
        sendSelfTelemetry("INFO", "Nexis.Nav", `Operator navigated to ${path}`);
      } catch {}
    };

    const handlePopState = () => {
      try {
        const path = window.location.pathname + window.location.search;
        sendSelfTelemetry("INFO", "Nexis.Nav", `Operator navigated (history) to ${path}`);
      } catch {}
    };
    window.addEventListener("popstate", handlePopState);

    // 3. User Click & Interaction Tracking (RUM)
    const breadcrumbs: { type: string; text: string; url: string; time: string }[] = [];
    const addBreadcrumb = (type: string, text: string) => {
      breadcrumbs.push({
        type,
        text,
        url: window.location.pathname,
        time: new Date().toISOString(),
      });
      if (breadcrumbs.length > 15) breadcrumbs.shift();
    };

    const handleClick = (event: MouseEvent) => {
      try {
        const target = (event.target as HTMLElement)?.closest("button, a, [role='button'], input, select");
        if (target) {
          const el = target as HTMLElement;
          const rawText = el.innerText?.trim() || "";
          const label =
            rawText.slice(0, 35) ||
            el.getAttribute("aria-label") ||
            el.getAttribute("title") ||
            el.getAttribute("name") ||
            el.tagName.toLowerCase();
          const targetType = el.tagName.toLowerCase();
          const path = window.location.pathname;
          addBreadcrumb("click", `Clicked ${targetType} "${label}"`);
          sendSelfTelemetry(
            "INFO",
            "User.Interaction",
            `Operator action: Clicked ${targetType} "${label}" on ${path}`,
            {
              element: targetType,
              label,
              path,
              id: el.id || undefined,
            }
          );
        }
      } catch {}
    };
    window.addEventListener("click", handleClick, true);

    // 4. Error monitoring with reproduction breadcrumb trail
    const handleError = (event: ErrorEvent) => {
      sendSelfTelemetry(
        "ERROR",
        "Nexis.Crash",
        `Unhandled UI Exception: ${event.message} at ${event.filename || "bundle"}:${event.lineno || 0}`,
        {
          stack: event.error?.stack,
          lineno: event.lineno,
          colno: event.colno,
          filename: event.filename,
          breadcrumbs: [...breadcrumbs],
        }
      );
    };
    window.addEventListener("error", handleError);

    const handleRejection = (event: PromiseRejectionEvent) => {
      sendSelfTelemetry(
        "ERROR",
        "Nexis.PromiseReject",
        `Unhandled Promise Rejection: ${event.reason?.message || String(event.reason)}`,
        { reason: String(event.reason), breadcrumbs: [...breadcrumbs] }
      );
    };
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.history.pushState = originalPushState;
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
