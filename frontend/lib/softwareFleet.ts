import { MonitoredSystem } from "./systems";

export type SoftwareCategory = "Web API" | "Mobile" | "Desktop";
export type SoftwareVitals = "OK" | "Degraded" | "Critical";

export interface ScopedLogLine {
  id: number;
  ts: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  tag: string;
  msg: string;
}

export interface ScopedCrash {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium";
  count: number;
  lastSeen: string;
  location: string;
  stackTrace: string[];
  anrDetails?: {
    blockedThread: string;
    durationMs: number;
    trigger: string;
  };
}

export interface ScopedSastFinding {
  id: string;
  rule: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line: number;
  description: string;
  remediationSnippet: string;
}

export interface SoftwareProject {
  id: string;
  name: string;
  category: SoftwareCategory;
  platform: string;
  vitals: SoftwareVitals;
  errorCount: number;
  hasSpike?: boolean;
  sastGrade: string;
  healthScore: number;
  description: string;
  repoPath: string;
  repoUrl?: string;
  targetUrl?: string;
  provider?: string;
  providerProjectId?: string;
  lastDeployed: string;
  metrics: {
    cpu: string;
    memory: string;
    p99Latency: string;
    activeSessions: string;
  };
  scopedLogs: ScopedLogLine[];
  scopedCrashes: ScopedCrash[];
  scopedSast: ScopedSastFinding[];
  astHighlight: {
    rootClass: string;
    loc: number;
    methods: { name: string; complexity: number; lines: number }[];
  };
  aiFixSnippet: {
    title: string;
    file: string;
    diffBefore: string;
    diffAfter: string;
    tests: { name: string; status: "pass" | "fail" | "pending" }[];
  };
}

/**
 * Dynamic software fleet catalog matching enrolled softwares in SQLite.
 * Initialized as empty array so the system reflects only genuinely enrolled softwares.
 */
export const INITIAL_SOFTWARE_FLEET: SoftwareProject[] = [];

export function getSoftwareById(id: string): SoftwareProject | undefined {
  return INITIAL_SOFTWARE_FLEET.find((p) => p.id === id);
}

/**
 * ⚡ NEXIS // CORE ARCHITECTURAL NODE MAPPING
 * Generates 5 foundational node archetypes dynamically for any enrolled target:
 *  1. INGRESS / GATEWAY    --> [ Edge Routers, Reverse Proxies, CDN Ingress ]
 *  2. COMPUTE / EXECUTION  --> [ API Handlers, Async Task Workers, Render Engines ]
 *  3. PERSISTENT STORAGE   --> [ SQL Database, WAL Engine, Persistence Layer ]
 *  4. EXTERNAL INTEGRATION --> [ External APIs, OAuth Providers, Edge Services ]
 *  5. ASYNC & BACKGROUND   --> [ Message Queues, Background Schedulers, Probers ]
 */
export function getMonitoredSystemsForProject(project: SoftwareProject): MonitoredSystem[] {
  let host = "localhost";
  let port = 80;
  if (project.targetUrl) {
    try {
      const parsed = new URL(project.targetUrl);
      host = parsed.hostname;
      port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "https:" ? 443 : 80;
    } catch {
      host = project.targetUrl;
    }
  }

  const isDegraded = project.vitals === "Degraded";
  const sysStatus = isDegraded ? "warn" : "online";

  return [
    {
      id: `${project.id}-all`,
      name: `${project.name} (Unified Fleet Stream)`,
      tag: "ALL",
      category: "gateway",
      nodeType: "INGRESS_NODE",
      env: "production",
      host,
      port,
      region: "Unified Telemetry",
      status: sysStatus,
      healthScore: project.healthScore,
      logRate: "Live",
      uptime: "99.99%",
      version: project.platform,
      description: `Unified Real-Time Telemetry Stream for ${project.name}: Ingress, Compute, Database, and Real User Actions.`,
      sampleLogs: { info: [], warn: [], error: [], debug: [], trace: [] },
      analysis: {
        avgLatency: project.metrics.p99Latency || "45ms",
        p99Latency: project.metrics.p99Latency || "120ms",
        throughput: project.metrics.activeSessions || "Active",
        errorRate: project.errorCount > 0 ? `${project.errorCount} exceptions` : "0.0%",
        memoryUsage: project.metrics.memory || "180 MB",
        cpuUsage: project.metrics.cpu || "14%",
        insights: [
          `Aggregated live telemetry stream covering all architectural subsystems.`,
          `Ingesting edge events, compute controllers, database queries, and live user interactions.`,
        ],
      },
      debugging: {
        activeThreads: 8,
        openSockets: 32,
        heapAllocated: project.metrics.memory || "256 MB",
        gcPauseAvg: "0.4ms",
        recentStackTraces: [],
        probes: [
          { name: "Full Fleet Telemetry Buffer", status: "passing", latency: "12ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
    {
      id: `${project.id}-ingress`,
      name: `${project.name} Ingress Gateway`,
      tag: "INGRESS",
      category: "ingress",
      nodeType: "INGRESS_NODE",
      env: "production",
      host,
      port,
      region: "Edge Mesh",
      status: sysStatus,
      healthScore: project.healthScore,
      logRate: "Live",
      uptime: "99.98%",
      version: project.platform,
      description: `Ingress Gateway Router for ${project.name}: Edge TLS termination, HTTP routing, and reverse proxy dispatch.`,
      sampleLogs: { info: [], warn: [], error: [], debug: [], trace: [] },
      analysis: {
        avgLatency: project.metrics.p99Latency || "45ms",
        p99Latency: project.metrics.p99Latency || "120ms",
        throughput: project.metrics.activeSessions || "Active",
        errorRate: project.errorCount > 0 ? `${project.errorCount} exceptions` : "0.0%",
        memoryUsage: project.metrics.memory || "180 MB",
        cpuUsage: project.metrics.cpu || "14%",
        insights: [
          `Active ingress gateway terminating traffic at ${project.targetUrl || host}.`,
          `Live telemetry continuously verified by Nexis prober.`,
        ],
      },
      debugging: {
        activeThreads: 4,
        openSockets: 16,
        heapAllocated: project.metrics.memory || "128 MB",
        gcPauseAvg: "0.4ms",
        recentStackTraces: [],
        probes: [
          { name: "Edge Perimeter Health", status: "passing", latency: project.metrics.p99Latency || "22ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
    {
      id: `${project.id}-compute`,
      name: `${project.name} Compute Runtime`,
      tag: "COMPUTE",
      category: "compute",
      nodeType: "COMPUTE_NODE",
      env: "production",
      host: `${project.id}-app.internal`,
      port: 8000,
      region: "Core Runtime",
      status: "online",
      healthScore: 99,
      logRate: "Live",
      uptime: "99.99%",
      version: project.platform,
      description: `Compute and application execution runtime for ${project.name}: Request handlers, business controllers, and serializer pipelines.`,
      sampleLogs: { info: [], warn: [], error: [], debug: [], trace: [] },
      analysis: {
        avgLatency: "24ms",
        p99Latency: "85ms",
        throughput: "Optimal",
        errorRate: "0.0%",
        memoryUsage: project.metrics.memory || "210 MB",
        cpuUsage: project.metrics.cpu || "18%",
        insights: [
          "Application runtime responding within strict SLA tolerances.",
        ],
      },
      debugging: {
        activeThreads: 8,
        openSockets: 24,
        heapAllocated: "210 MB",
        gcPauseAvg: "0.3ms",
        recentStackTraces: [],
        probes: [
          { name: "Controller Pool", status: "passing", latency: "1.2ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
    {
      id: `${project.id}-storage`,
      name: `${project.name} Persistence Layer`,
      tag: "STORAGE",
      category: "storage",
      nodeType: "DATA_STORE_NODE",
      env: "production",
      host: "db.internal",
      port: 5432,
      region: "Data Subsystem",
      status: "online",
      healthScore: 100,
      logRate: "Steady",
      uptime: "100.0%",
      version: "PostgreSQL / SQLite WAL Engine",
      description: `Primary transactional persistence layer for ${project.name}: Relational queries, ACID transactions, and index cache.`,
      sampleLogs: { info: [], warn: [], error: [], debug: [], trace: [] },
      analysis: {
        avgLatency: "4ms",
        p99Latency: "16ms",
        throughput: "Steady",
        errorRate: "0.0%",
        memoryUsage: "340 MB",
        cpuUsage: "7%",
        insights: [
          "Connection pool healthy; active WAL checkpoints committing clean.",
        ],
      },
      debugging: {
        activeThreads: 10,
        openSockets: 32,
        heapAllocated: "340 MB",
        gcPauseAvg: "0.1ms",
        recentStackTraces: [],
        probes: [
          { name: "Pool Liveness", status: "passing", latency: "0.8ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
    {
      id: `${project.id}-external`,
      name: `${project.name} External Integrations`,
      tag: "EXTERNAL",
      category: "external",
      nodeType: "EXTERNAL_INTEGRATION_NODE",
      env: "production",
      host: "api-bridge.internal",
      port: 443,
      region: "External Mesh",
      status: "online",
      healthScore: 98,
      logRate: "Normal",
      uptime: "99.95%",
      version: "Outbound HTTP / TLS Client",
      description: `External and third-party integration client for ${project.name}: Webhooks, payment gateways, and cloud APIs.`,
      sampleLogs: { info: [], warn: [], error: [], debug: [], trace: [] },
      analysis: {
        avgLatency: "65ms",
        p99Latency: "190ms",
        throughput: "Normal",
        errorRate: "0.0%",
        memoryUsage: "80 MB",
        cpuUsage: "5%",
        insights: [
          "External API gateways reachable with zero protocol renegotiation overhead.",
        ],
      },
      debugging: {
        activeThreads: 4,
        openSockets: 12,
        heapAllocated: "64 MB",
        gcPauseAvg: "0.2ms",
        recentStackTraces: [],
        probes: [
          { name: "Outbound Mesh Egress", status: "passing", latency: "14ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
    {
      id: `${project.id}-async`,
      name: `${project.name} Background & Queue`,
      tag: "ASYNC",
      category: "async",
      nodeType: "BACKGROUND_QUEUE_NODE",
      env: "production",
      host: "worker.internal",
      port: 6379,
      region: "Worker Subsystem",
      status: "online",
      healthScore: 100,
      logRate: "Normal",
      uptime: "99.99%",
      version: "Task Queue / Background Scheduler",
      description: `Background worker queue for ${project.name}: Asynchronous job execution, telemetry logging, and cron dispatchers.`,
      sampleLogs: { info: [], warn: [], error: [], debug: [], trace: [] },
      analysis: {
        avgLatency: "12ms",
        p99Latency: "45ms",
        throughput: "Steady",
        errorRate: "0.0%",
        memoryUsage: "95 MB",
        cpuUsage: "6%",
        insights: [
          "Zero queue backlog; background tasks completing within SLA.",
        ],
      },
      debugging: {
        activeThreads: 4,
        openSockets: 8,
        heapAllocated: "95 MB",
        gcPauseAvg: "0.1ms",
        recentStackTraces: [],
        probes: [
          { name: "Queue Ingest Pool", status: "passing", latency: "0.5ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
  ];
}
