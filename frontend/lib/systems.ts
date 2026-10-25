export type SystemStatus = "online" | "warn" | "error" | "idle";
export type SeverityLevel = "critical" | "high" | "medium" | "low";

export type CoreNodeType =
  | "INGRESS_NODE"
  | "COMPUTE_NODE"
  | "DATA_STORE_NODE"
  | "EXTERNAL_INTEGRATION_NODE"
  | "BACKGROUND_QUEUE_NODE";

export interface SystemIssue {
  id: string;
  title: string;
  severity: SeverityLevel;
  time: string;
  status: "open" | "investigating" | "mitigated";
  description: string;
}

export interface SystemRecommendation {
  id: string;
  title: string;
  severity: SeverityLevel;
  impact: string;
  suggestedFix: string;
  autoFixable: boolean;
  category: "Performance" | "Reliability" | "Security" | "Cost";
}

export interface SystemDebuggingInfo {
  activeThreads: number;
  openSockets: number;
  heapAllocated: string;
  gcPauseAvg: string;
  recentStackTraces: {
    id: string;
    timestamp: string;
    error: string;
    location: string;
    stack: string[];
  }[];
  probes: {
    name: string;
    status: "passing" | "degraded" | "failing";
    latency: string;
  }[];
}

export interface SystemAnalysis {
  avgLatency: string;
  p99Latency: string;
  throughput: string;
  errorRate: string;
  memoryUsage: string;
  cpuUsage: string;
  insights: string[];
}

export interface MonitoredSystem {
  id: string;
  name: string;
  tag: string;
  category: "service" | "database" | "gateway" | "worker" | "cdn" | "search" | "ingress" | "compute" | "storage" | "external" | "async";
  nodeType?: CoreNodeType;
  env: "production" | "staging";
  host: string;
  port: number;
  region: string;
  status: SystemStatus;
  healthScore: number;
  logRate: string;
  uptime: string;
  version: string;
  description: string;
  sampleLogs: {
    info: string[];
    warn: string[];
    error: string[];
    debug: string[];
    trace: string[];
  };
  analysis: SystemAnalysis;
  debugging: SystemDebuggingInfo;
  recommendations: SystemRecommendation[];
  issues: SystemIssue[];
}

export const MONITORED_SYSTEMS: MonitoredSystem[] = [];

export function getSystemById(id: string): MonitoredSystem | undefined {
  return undefined;
}
