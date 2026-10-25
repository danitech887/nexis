import type { Metadata } from "next";
import "./globals.css";
import { Topbar } from "@/components/shell/Topbar";
import { SidebarNav } from "@/components/shell/SidebarNav";

export const metadata: Metadata = {
  title: "Nexis — Dev-Ops & AST Radar",
  description: "Cyberpunk monitoring, log analysis, security audit, and remediation platform.",
  icons: {
    icon: "/nexis-emblem.png",
  },
};

import { ActiveSoftwareProvider } from "@/lib/ActiveSoftwareContext";
import { NexisSelfTelemetryListener } from "@/lib/nexisSelfTelemetry";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex flex-col overflow-hidden cyber-grid-bg">
        <ActiveSoftwareProvider>
          {/* Nexis Self-Monitoring Telemetry Sensor */}
          <NexisSelfTelemetryListener />

          {/* Persistent Topbar HUD */}
          <Topbar />

          {/* Content area: sidebar + page */}
          <div className="flex flex-1 min-h-0">
            <SidebarNav />
            <main className="flex-1 min-w-0 overflow-hidden">
              {children}
            </main>
          </div>
        </ActiveSoftwareProvider>
      </body>
    </html>
  );
}
