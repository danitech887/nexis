export const BACKEND_API_BASE =
  process.env.NEXT_PUBLIC_NEXIS_BACKEND_URL || "http://localhost:8000/api/v1";

export interface EnrolledNode {
  id: string;
  software_id: string;
  name: string;
  node_type: "INGRESS" | "COMPUTE" | "STORAGE" | "ASYNC";
  endpoint_url?: string;
  health_status: "HEALTHY" | "DEGRADED" | "OFFLINE";
  created_at?: string;
}

export interface EnrolledSoftware {
  id: string;
  name: string;
  category: "Web API" | "Mobile" | "Desktop" | "Frontend App" | "Microservice";
  platform: string;
  local_repo_path: string;
  repo_url?: string;
  target_url?: string;
  provider?: string;
  provider_project_id?: string;
  description?: string;
  status: "ACTIVE" | "PAUSED" | "DEGRADED";
  health_score: number;
  created_at?: string;
  updated_at?: string;
  nodes: EnrolledNode[];
}

export interface PathInspectionResult {
  valid: boolean;
  error?: string;
  expanded_path: string;
  has_git: boolean;
  git_remote_url?: string;
  platform_detected: string;
  category_suggested: "Web API" | "Mobile" | "Desktop";
  signature_files: string[];
  total_top_level_files: number;
}

export interface RepoCloneResult {
  success: boolean;
  cloned_path: string;
  folder_name: string;
  already_existed: boolean;
  message: string;
  error?: string;
  inspection?: PathInspectionResult;
}

export interface EnrollmentResult {
  software: EnrolledSoftware;
  api_key_raw: string;
  env_block: string;
  connector_file_path?: string;
  connector_file_name?: string;
  connector_generated?: boolean;
  connector_snippet?: string;
  connector_instructions?: string;
}

export async function fetchEnrolledSoftwares(): Promise<EnrolledSoftware[]> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/softwares`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Failed to fetch softwares from Nexis backend, fallback to local:", err);
    return [];
  }
}

export async function inspectPathOnBackend(local_path: string): Promise<PathInspectionResult> {
  const res = await fetch(`${BACKEND_API_BASE}/softwares/inspect-path`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ local_path }),
  });
  if (!res.ok) {
    throw new Error(`Path inspection failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export interface DirectorySubdirItem {
  name: string;
  path: string;
  has_git?: boolean;
}

export interface DirectoryBrowseResult {
  current_path: string;
  parent_path?: string | null;
  directories: string[];
  subdirectories?: DirectorySubdirItem[];
  error?: string;
}

export async function browseDirectoriesOnBackend(path?: string): Promise<DirectoryBrowseResult> {
  const url = path
    ? `${BACKEND_API_BASE}/softwares/browse-dirs?path=${encodeURIComponent(path)}`
    : `${BACKEND_API_BASE}/softwares/browse-dirs`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function cloneRepoOnBackend(payload: {
  repo_url: string;
  destination_parent_dir?: string;
  custom_folder_name?: string;
  branch?: string;
}): Promise<RepoCloneResult> {
  const res = await fetch(`${BACKEND_API_BASE}/softwares/clone-repo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Clone failed with HTTP ${res.status}`);
  }
  return await res.json();
}

export async function enrollSoftwareOnBackend(payload: {
  name: string;
  category: string;
  platform?: string;
  local_repo_path: string;
  repo_url?: string;
  git_branch?: string;
  environment?: string;
  target_url?: string;
  backend_url?: string;
  provider?: string;
  provider_api_key?: string;
  provider_project_id?: string;
  description?: string;
  auto_generate_connector?: boolean;
}): Promise<EnrollmentResult> {
  const res = await fetch(`${BACKEND_API_BASE}/softwares/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Enrollment failed with HTTP ${res.status}`);
  }
  return await res.json();
}

export async function deEnrollSoftwareOnBackend(software_id: string): Promise<boolean> {
  const res = await fetch(`${BACKEND_API_BASE}/softwares/${software_id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  return res.ok;
}

export interface LiveVitalsPayload {
  software_id: string;
  software_name: string;
  vitals: "OK" | "Degraded" | "Critical";
  health_score: number;
  platform: string;
  repo_path: string;
  target_url?: string;
  target_accessible: boolean;
  metrics: {
    cpu: string;
    memory: string;
    memory_percent: string;
    p99_latency: string;
    error_count: number;
    has_spike: boolean;
    active_sessions: string;
    sast_grade: string;
  };
  subsystems: {
    name: string;
    grade: string;
    status: "online" | "warn" | "offline";
    note?: string | null;
  }[];
  incidents: {
    id: string;
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    location: string;
    last_seen: string;
    count: number;
    details: string;
  }[];
  timestamp: string;
}

export async function fetchVitalsForSoftware(software_id: string): Promise<LiveVitalsPayload | null> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/vitals/${software_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("Backend vitals fetch failed, falling back to cached state:", e);
    return null;
  }
}

export interface TelemetryLogEntry {
  id: number;
  software_id: string;
  system_id: string;
  source: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG" | "TRACE";
  tag: string;
  msg: string;
  stack_trace?: string | null;
  metadata?: Record<string, any>;
  ts: string;
}

export interface QueryLogsParams {
  software_id?: string;
  system_id?: string;
  level?: string;
  search?: string;
  limit?: number;
  since_id?: number;
}

export async function fetchTelemetryLogs(params: QueryLogsParams = {}): Promise<TelemetryLogEntry[]> {
  try {
    const q = new URLSearchParams();
    if (params.software_id) q.set("software_id", params.software_id);
    if (params.system_id && params.system_id !== "all") q.set("system_id", params.system_id);
    if (params.level && params.level !== "ALL") q.set("level", params.level);
    if (params.search) q.set("search", params.search);
    if (params.limit) q.set("limit", String(params.limit));
    if (params.since_id) q.set("since_id", String(params.since_id));

    const res = await fetch(`${BACKEND_API_BASE}/telemetry/events?${q.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  } catch (e) {
    console.warn("fetchTelemetryLogs error:", e);
    return [];
  }
}

export async function ingestTelemetryLog(payload: {
  system_id: string;
  message: string;
  level?: string;
  tag?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/telemetry/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_id: payload.system_id,
        message: payload.message,
        level: payload.level || "INFO",
        tag: payload.tag || "console",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function clearBackendLogs(software_id?: string, system_id?: string): Promise<boolean> {
  try {
    const q = new URLSearchParams();
    if (software_id) q.set("software_id", software_id);
    if (system_id) q.set("system_id", system_id);

    const res = await fetch(`${BACKEND_API_BASE}/telemetry/events?${q.toString()}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSoftwareErrors(software_id: string, limit: number = 200): Promise<TelemetryLogEntry[]> {
  try {
    return await fetchTelemetryLogs({
      software_id,
      level: "ERROR",
      limit,
    });
  } catch (err) {
    console.warn("fetchSoftwareErrors failed:", err);
    return [];
  }
}

export interface RemediationPayload {
  rule_id: string;
  title?: string;
  origin?: "Security (SAST)" | "Runtime Crash" | "Quality (AST)" | "Telemetry Log";
  severity?: "critical" | "high" | "medium" | "low";
  file_path: string;
  line_number: number;
  snippet: string;
  error_message?: string;
}

export interface ErrorSourceLocationResult {
  found: boolean;
  software_id?: string;
  file_path?: string;
  absolute_path?: string;
  line_number?: number;
  enclosing_scope?: string;
  symbol?: string;
  symbols_detected?: string[];
  source_window?: {
    startLine: number;
    lines: { num: number; code: string; isTarget?: boolean }[];
  };
  patch_diff?: {
    before: string;
    after: string;
    description: string;
  };
  root_cause?: string;
  resolution?: string;
  unit_test_code?: string;
  all_matches?: { file: string; line: number; content: string }[];
  message?: string;
}

export async function locateSourceError(payload: {
  error_message: string;
  software_id?: string;
  stack_trace?: string;
}): Promise<ErrorSourceLocationResult | null> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/remediation/locate-source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("locateSourceError failed:", err);
    return null;
  }
}

export async function requestRemediation(payload: RemediationPayload) {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/remediation/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Remediation failed: HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e: any) {
    console.warn("requestRemediation error:", e);
    return null;
  }
}

export async function executeVerifyTest(testCode: string, implementationCode: string = "") {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/remediation/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test_code: testCode,
        implementation_code: implementationCode,
      }),
    });
    if (!res.ok) throw new Error(`Verify failed: HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("executeVerifyTest failed:", err);
    return null;
  }
}

export interface SecurityAuditResult {
  repo_path: string;
  scanned_files: number;
  cves: any[];
  sastFindings: any[];
  summary: {
    criticalCves: number;
    highCves: number;
    sastIssues: number;
    riskScore: string;
    scannedFiles: number;
  };
}

export async function fetchSoftwareSecurityAudit(software_id: string): Promise<SecurityAuditResult | null> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/security/audit/${software_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("fetchSoftwareSecurityAudit failed:", err);
    return null;
  }
}

export async function executeAutoBumpPackage(software_id: string, package_name: string, target_version?: string) {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/security/autobump`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        software_id,
        package_name,
        target_version,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("executeAutoBumpPackage failed:", err);
    return null;
  }
}

export interface QualityScanResult {
  repo_path: string;
  repo_url?: string;
  fileMetrics: any[];
  endpoints: any[];
  docs: any[];
  summary: {
    avgComplexity: number;
    totalLoc: number;
    totalFuncs: number;
    refactorTriggersCount: number;
  };
}

export interface RefactorCommitPayload {
  software_id: string;
  file_path: string;
  diff_before: string;
  diff_after: string;
  commit_message?: string;
  branch?: string;
}

export interface RefactorCommitResult {
  success: boolean;
  commit_sha?: string;
  full_sha?: string;
  commit_url?: string;
  file_url?: string;
  branch?: string;
  message?: string;
  error?: string;
  pushed?: boolean;
}

export async function commitRefactorToGitHub(
  payload: RefactorCommitPayload
): Promise<RefactorCommitResult> {
  const res = await fetch(`${BACKEND_API_BASE}/quality/refactor/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Commit failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchSoftwareQualityMetrics(software_id: string): Promise<QualityScanResult | null> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/quality/software/${software_id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("fetchSoftwareQualityMetrics failed:", err);
    return null;
  }
}

export async function syncVercelApiLogs(software_id?: string, project_name?: string): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/telemetry/vercel-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        software_id: software_id || "all",
        project_name,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("syncVercelApiLogs failed:", err);
    return null;
  }
}

export interface CloudProviderInfo {
  id: string;
  name: string;
  category: string;
  token_label: string;
  project_label?: string | null;
  token_url?: string | null;
  doc_url?: string | null;
  placeholder: string;
  guide: string[];
  capabilities: string[];
}

export interface CloudDiscoveryProject {
  id: string;
  name: string;
  type?: string;
  target_url?: string;
  updated_at?: string;
}

export interface CloudVerifyResult {
  valid: boolean;
  provider?: string;
  projects?: CloudDiscoveryProject[];
  error?: string;
}

export async function fetchCloudProviders(): Promise<CloudProviderInfo[]> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/cloud/providers`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.providers || [];
  } catch {
    return [];
  }
}

export async function verifyCloudCredentials(provider: string, apiKey: string): Promise<CloudVerifyResult> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/cloud/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, api_key: apiKey }),
    });
    return await res.json();
  } catch (err: any) {
    return { valid: false, error: err.message || "Failed to contact backend." };
  }
}

export async function syncCloudProviderLogs(softwareId: string): Promise<any> {
  try {
    const res = await fetch(`${BACKEND_API_BASE}/cloud/sync/${softwareId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  } catch (err: any) {
    return { status: "error", message: err.message || "Sync failed" };
  }
}


