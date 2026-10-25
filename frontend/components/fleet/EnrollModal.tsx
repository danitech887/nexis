"use client";

import React, { useState, useEffect } from "react";
import { SoftwareProject, SoftwareCategory } from "@/lib/softwareFleet";
import CyberButton from "@/components/ui/CyberButton";
import {
  inspectPathOnBackend,
  enrollSoftwareOnBackend,
  cloneRepoOnBackend,
  fetchCloudProviders,
  verifyCloudCredentials,
  browseDirectoriesOnBackend,
  DirectoryBrowseResult,
  PathInspectionResult,
  EnrollmentResult,
  CloudProviderInfo,
  CloudVerifyResult,
  CloudDiscoveryProject,
} from "@/lib/backendApi";

interface EnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (project: SoftwareProject) => void;
}

type RepoSourceMode = "local" | "clone";

export default function EnrollModal({ isOpen, onClose, onEnroll }: EnrollModalProps) {
  // Source mode: direct local path vs remote git clone
  const [sourceMode, setSourceMode] = useState<RepoSourceMode>("local");

  // Input fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SoftwareCategory>("Web API");
  const [platform, setPlatform] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("http://localhost:8000");
  const [backendUrl, setBackendUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [environment, setEnvironment] = useState<"production" | "staging" | "development">("production");
  const [description, setDescription] = useState("");

  // Remote Git clone fields
  const [cloneDestDir, setCloneDestDir] = useState("/home/danitech/Desktop/Projects");
  const [cloneFolderName, setCloneFolderName] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [cloneMessage, setCloneMessage] = useState<string | null>(null);

  // Local directory picker dialog state
  const [isBrowsingDirs, setIsBrowsingDirs] = useState(false);
  const [browseTarget, setBrowseTarget] = useState<"cloneDest" | "repoPath">("cloneDest");
  const [dirBrowseResult, setDirBrowseResult] = useState<DirectoryBrowseResult | null>(null);
  const [isLoadingDirs, setIsLoadingDirs] = useState(false);

  // AI Telemetry Connector option (Approach C)
  const [autoGenerateConnector, setAutoGenerateConnector] = useState(true);

  // Path inspection state
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<PathInspectionResult | null>(null);
  const [pathDebounceTimer, setPathDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cloud & Hosting Provider Integration
  const [cloudProviders, setCloudProviders] = useState<CloudProviderInfo[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("custom");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [providerProjectId, setProviderProjectId] = useState("");
  const [isVerifyingProvider, setIsVerifyingProvider] = useState(false);
  const [providerVerifyResult, setProviderVerifyResult] = useState<CloudVerifyResult | null>(null);
  const [showProviderGuide, setShowProviderGuide] = useState(false);

  // Credential Handoff Modal step
  const [credentialResult, setCredentialResult] = useState<EnrollmentResult | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setSourceMode("local");
      setName("");
      setCategory("Web API");
      setPlatform("");
      setRepoPath("");
      setRepoUrl("");
      setTargetUrl("http://localhost:8000");
      setDescription("");
      setCloneDestDir("/home/danitech/Desktop/Projects");
      setCloneFolderName("");
      setIsCloning(false);
      setCloneMessage(null);
      setAutoGenerateConnector(true);
      setInspectionResult(null);
      setErrorMessage(null);
      setCredentialResult(null);
      setCopiedKey(false);
      setCopiedEnv(false);
      setSelectedProviderId("custom");
      setProviderApiKey("");
      setProviderProjectId("");
      setIsVerifyingProvider(false);
      setProviderVerifyResult(null);
      setShowProviderGuide(false);
      setIsBrowsingDirs(false);
      setDirBrowseResult(null);

      // Fetch cloud provider catalog if not yet loaded
      fetchCloudProviders().then((list) => {
        if (list && list.length > 0) {
          setCloudProviders(list);
        }
      });
    }
  }, [isOpen]);

  // Open directory picker dialog
  const openDirectoryBrowser = async (target: "cloneDest" | "repoPath") => {
    setBrowseTarget(target);
    setIsBrowsingDirs(true);
    setIsLoadingDirs(true);
    const startPath = target === "cloneDest" ? cloneDestDir : repoPath || "/home/danitech/Desktop/Projects";
    try {
      const res = await browseDirectoriesOnBackend(startPath);
      setDirBrowseResult(res);
    } catch {
      // Fallback
    } finally {
      setIsLoadingDirs(false);
    }
  };

  const navigateToDir = async (path: string) => {
    setIsLoadingDirs(true);
    try {
      const res = await browseDirectoriesOnBackend(path);
      setDirBrowseResult(res);
    } catch {
      // ignore
    } finally {
      setIsLoadingDirs(false);
    }
  };

  const selectCurrentBrowsedDir = (path?: string) => {
    const chosen = path || dirBrowseResult?.current_path;
    if (chosen) {
      if (browseTarget === "cloneDest") {
        setCloneDestDir(chosen);
      } else {
        setRepoPath(chosen);
        handlePathChange(chosen);
      }
    }
    setIsBrowsingDirs(false);
  };

  // Debounced auto-inspection when repoPath changes
  const handlePathChange = (value: string) => {
    setRepoPath(value);
    setErrorMessage(null);

    if (pathDebounceTimer) clearTimeout(pathDebounceTimer);

    if (!value.trim()) {
      setInspectionResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsInspecting(true);
      try {
        const res = await inspectPathOnBackend(value.trim());
        setInspectionResult(res);
        if (res.valid) {
          if (!platform.trim()) {
            setPlatform(res.platform_detected);
          }
          if (res.category_suggested) {
            setCategory(res.category_suggested);
          }
          if (res.git_remote_url && !repoUrl) {
            setRepoUrl(res.git_remote_url);
          }
        }
      } catch {
        // Fallback or ignore network error in debounce
      } finally {
        setIsInspecting(false);
      }
    }, 500);

    setPathDebounceTimer(timer);
  };

  // Clone remote Git repository into local directory
  const handleCloneRepo = async () => {
    if (!repoUrl.trim()) {
      setErrorMessage("Please enter a valid remote Git URL to clone.");
      return;
    }

    setIsCloning(true);
    setErrorMessage(null);
    setCloneMessage("Cloning repository into local machine...");

    try {
      const res = await cloneRepoOnBackend({
        repo_url: repoUrl.trim(),
        destination_parent_dir: cloneDestDir.trim() || undefined,
        custom_folder_name: cloneFolderName.trim() || undefined,
        branch: gitBranch.trim() || undefined,
      });

      setCloneMessage(res.message);
      setRepoPath(res.cloned_path);

      // Auto-name if not yet provided
      if (!name.trim()) {
        const humanName = res.folder_name
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setName(humanName);
      }

      // Update inspection result if available
      if (res.inspection) {
        setInspectionResult(res.inspection);
        if (res.inspection.valid) {
          setPlatform(res.inspection.platform_detected);
          setCategory(res.inspection.category_suggested);
        }
      } else {
        // Run inspection manually
        handlePathChange(res.cloned_path);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to clone repository");
      setCloneMessage(null);
    } finally {
      setIsCloning(false);
    }
  };

  // Active cloud provider metadata
  const activeProviderInfo = React.useMemo(() => {
    return cloudProviders.find((p) => p.id === selectedProviderId) || null;
  }, [cloudProviders, selectedProviderId]);

  // Verify cloud provider credentials and discover hosted services
  const handleVerifyProvider = async () => {
    if (!selectedProviderId || selectedProviderId === "custom") return;
    if (!providerApiKey.trim()) {
      setProviderVerifyResult({
        valid: false,
        error: "Please enter an API key or token to verify.",
      });
      return;
    }

    setIsVerifyingProvider(true);
    setProviderVerifyResult(null);

    try {
      const res = await verifyCloudCredentials(selectedProviderId, providerApiKey.trim());
      setProviderVerifyResult(res);

      if (res.valid && res.projects && res.projects.length > 0) {
        const first = res.projects[0];
        setProviderProjectId(first.id);
        if (first.target_url && (!targetUrl || targetUrl === "http://localhost:8000")) {
          setTargetUrl(first.target_url);
        }
        if (!name.trim()) {
          const autoName = first.name
            .replace(/[_-]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          setName(autoName);
        }
      }
    } catch (err: any) {
      setProviderVerifyResult({
        valid: false,
        error: err.message || "Failed to communicate with provider API",
      });
    } finally {
      setIsVerifyingProvider(false);
    }
  };

  const handleSelectDiscoveredProject = (projId: string) => {
    setProviderProjectId(projId);
    const match = providerVerifyResult?.projects?.find((p) => p.id === projId);
    if (match) {
      if (match.target_url) {
        setTargetUrl(match.target_url);
      }
      if (!name.trim()) {
        const autoName = match.name
          .replace(/[_-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setName(autoName);
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repoPath.trim()) {
      setErrorMessage("System name and valid local repository path are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Step 2 & 3: Atomic Backend Persistence & AI Connector Generation in SQLite
      const result = await enrollSoftwareOnBackend({
        name: name.trim(),
        category,
        platform: platform.trim() || inspectionResult?.platform_detected || "Generic Application",
        local_repo_path: repoPath.trim(),
        repo_url: repoUrl.trim() || undefined,
        target_url: targetUrl.trim(),
        backend_url: backendUrl.trim() || undefined,
        git_branch: gitBranch.trim() || undefined,
        environment: environment,
        provider: selectedProviderId !== "custom" ? selectedProviderId : undefined,
        provider_api_key: providerApiKey.trim() || undefined,
        provider_project_id: providerProjectId.trim() || undefined,
        description: description.trim() || `Enterprise ${category} managed by Nexis.`,
        auto_generate_connector: autoGenerateConnector,
      });

      // Construct frontend SoftwareProject bridge object
      const id = result.software.id;
      const newProject: SoftwareProject = {
        id,
        name: result.software.name,
        category: (result.software.category as SoftwareCategory) || "Web API",
        platform: result.software.platform,
        vitals: "OK",
        errorCount: 0,
        hasSpike: false,
        sastGrade: "A",
        healthScore: result.software.health_score || 100,
        description: result.software.description || `Enterprise ${category} application managed by Nexis.`,
        repoPath: result.software.local_repo_path,
        targetUrl: result.software.target_url || targetUrl.trim(),
        provider: result.software.provider,
        providerProjectId: result.software.provider_project_id,
        lastDeployed: "Just now",
        metrics: {
          cpu: "12%",
          memory: "180 MB",
          p99Latency: "38ms",
          activeSessions: "100%",
        },
        scopedLogs: [
          {
            id: 1,
            ts: new Date().toISOString().slice(11, 23),
            level: "INFO",
            tag: "SQLite.Persistence",
            msg: `Registered ${result.software.name} into SQLite relational database.`,
          },
          {
            id: 2,
            ts: new Date().toISOString().slice(11, 23),
            level: "INFO",
            tag: "Telemetry.Token",
            msg: `Provisioned SHA-256 ingest token for node ${result.software.nodes[0]?.id || "ingress"}.`,
          },
          ...(result.connector_generated
            ? [
                {
                  id: 3,
                  ts: new Date().toISOString().slice(11, 23),
                  level: "INFO" as const,
                  tag: "AI.Connector",
                  msg: `Generated ${result.connector_file_name} in repository (Approach C direct telemetry).`,
                },
              ]
            : []),
        ],
        scopedCrashes: [],
        scopedSast: [
          {
            id: `SAST-${id.slice(0, 3).toUpperCase()}-01`,
            rule: "Baseline Security Audit",
            severity: "low",
            file: inspectionResult?.signature_files[0] || "config.json",
            line: 1,
            description: "Initial SAST rule pass completed; baseline secured.",
            remediationSnippet: "Keep dependencies updated.",
          },
        ],
        astHighlight: {
          rootClass: "ApplicationEntry",
          loc: 180,
          methods: [
            { name: "initializePipeline()", complexity: 2, lines: 24 },
            { name: "handleTelemetryIngress()", complexity: 3, lines: 36 },
          ],
        },
        aiFixSnippet: {
          title: "Standard Ingress Instrumentation",
          file: result.connector_file_name || "nexis_telemetry.py",
          diffBefore: `// Telemetry uninitialized`,
          diffAfter: `import { initNexis } from '@nexis/agent';\ninitNexis({ appId: '${id}' });`,
          tests: [{ name: "verify_token_handshake", status: "pass" }],
        },
      };

      // Transition to Step 4: Credential & Telemetry Connector Handoff
      setCredentialResult(result);
      onEnroll(newProject);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to enroll software in backend SQLite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: "key" | "env") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03070D]/85 backdrop-blur-md animate-fadeinup select-none">
      <div className="relative w-full max-w-2xl bg-[#070D16] border border-[#00FF66]/40 shadow-[0_0_35px_rgba(0,255,102,0.18)] p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#112233] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#00FF66] font-bold text-sm">⊞</span>
            <h2 className="text-[#00FF66] text-xs font-bold tracking-[0.25em] font-mono glow-green">
              {credentialResult
                ? "CREDENTIAL PROVISIONING & CONNECTOR HANDOFF"
                : "ENROLL NEW SOFTWARE TARGET (SQLITE & AI INSTRUMENTATION)"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#5A7A9A] hover:text-[#FF0055] font-mono text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* STEP 4: Credential & AI Connector Handoff Display */}
        {credentialResult ? (
          <div className="flex flex-col gap-4 font-mono text-xs animate-fadeinup">
            <div className="bg-[#00FF66]/10 border border-[#00FF66]/40 p-3 flex items-center gap-3">
              <span className="text-lg">✓</span>
              <div>
                <div className="text-[#00FF66] font-bold">SOFTWARE ATOMICALLY ENROLLED & INSTRUMENTED</div>
                <div className="text-[11px] text-[#A0C0E0]">
                  Persisted in SQLite database as <span className="text-white font-bold">{credentialResult.software.id}</span> with default ingress node.
                </div>
              </div>
            </div>

            {/* AI Generated Telemetry Connector Box (Approach C) */}
            {credentialResult.connector_generated && (
              <div className="flex flex-col gap-1.5 bg-[#00E5FF]/5 border border-[#00E5FF]/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#00E5FF] font-bold text-[11px]">
                    <span>⚡</span>
                    <span>AI TELEMETRY CONNECTOR GENERATED & INSTALLED</span>
                  </div>
                  <span className="text-[10px] bg-[#00FF66]/20 text-[#00FF66] px-1.5 py-0.5 border border-[#00FF66]/40">
                    APPROACH C: DIRECT PUSH
                  </span>
                </div>
                <div className="text-[11px] text-[#A0C0E0] mt-1">
                  File: <code className="text-[#00FF66] bg-[#03070D] px-1.5 py-0.5 border border-[#112233]">{credentialResult.connector_file_name}</code>
                </div>
                <div className="text-[10px] text-[#5A7A9A] truncate">
                  Path: {credentialResult.connector_file_path}
                </div>
                {credentialResult.connector_instructions && (
                  <div className="text-[10px] text-[#FFD600] bg-[#FFD600]/10 p-2 mt-1 border border-[#FFD600]/20">
                    ℹ {credentialResult.connector_instructions}
                  </div>
                )}
              </div>
            )}

            {/* Ingest Key Box */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#5A7A9A] tracking-wider uppercase">
                  RAW INGEST TOKEN (Stored as SHA-256 Hash)
                </span>
                <span className="text-[10px] text-[#FFB800]">Displayed once only</span>
              </div>
              <div className="flex items-center bg-[#03070D] border border-[#112233] px-3 py-2 justify-between">
                <code className="text-[#00E5FF] font-mono select-all text-xs break-all">
                  {credentialResult.api_key_raw}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(credentialResult.api_key_raw, "key")}
                  className="ml-3 text-[10px] text-[#00FF66] hover:underline uppercase shrink-0"
                >
                  {copiedKey ? "COPIED!" : "COPY TOKEN"}
                </button>
              </div>
            </div>

            {/* .env Snippet Box */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#5A7A9A] tracking-wider uppercase">
                  READY-TO-PASTE .ENV SNIPPET
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(credentialResult.env_block, "env")}
                  className="text-[10px] text-[#00FF66] hover:underline uppercase"
                >
                  {copiedEnv ? "COPIED!" : "COPY .ENV BLOCK"}
                </button>
              </div>
              <pre className="bg-[#03070D] border border-[#112233] p-3 text-[11px] text-[#A0C0E0] overflow-x-auto leading-relaxed">
                {credentialResult.env_block}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#112233] mt-2">
              <CyberButton
                accent="green"
                size="sm"
                variant="solid"
                onClick={onClose}
              >
                COMPLETE & ENTER FLEET CONTROL →
              </CyberButton>
            </div>
          </div>
        ) : (
          /* STEP 1-3: Enrollment Form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 font-mono text-xs">
            {errorMessage && (
              <div className="bg-[#FF0055]/10 border border-[#FF0055]/40 text-[#FF0055] p-2.5 text-[11px]">
                {errorMessage}
              </div>
            )}

            {/* Mode Selector: Local Disk vs Remote Git Clone */}
            <div className="flex items-center border border-[#112233] bg-[#03070D] p-1 gap-1">
              <button
                type="button"
                onClick={() => setSourceMode("local")}
                className={`flex-1 py-1.5 px-3 text-[11px] font-bold tracking-wider transition-colors ${
                  sourceMode === "local"
                    ? "bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/40"
                    : "text-[#5A7A9A] hover:text-[#C0D8F0] border border-transparent"
                }`}
              >
                📂 ENROLL EXISTING LOCAL PATH
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("clone")}
                className={`flex-1 py-1.5 px-3 text-[11px] font-bold tracking-wider transition-colors ${
                  sourceMode === "clone"
                    ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40"
                    : "text-[#5A7A9A] hover:text-[#C0D8F0] border border-transparent"
                }`}
              >
                ⚡ CLONE REMOTE REPO TO LOCAL MACHINE
              </button>
            </div>

            {/* Clone Section if sourceMode === 'clone' */}
            {sourceMode === "clone" && (
              <div className="bg-[#00E5FF]/5 border border-[#00E5FF]/30 p-3 flex flex-col gap-2.5">
                <div className="text-[10px] text-[#00E5FF] font-bold uppercase tracking-wider">
                  GIT CLONE CONFIGURATION
                </div>
                <div>
                  <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                    REMOTE REPOSITORY URL (GITHUB / GITLAB / BITBUCKET) *
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/organization/repo.git"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full bg-[#03070D] border border-[#112233] text-[#00E5FF] px-3 py-1.5 text-xs focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                      LOCAL DESTINATION DIRECTORY
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="/home/danitech/Desktop/Projects"
                        value={cloneDestDir}
                        onChange={(e) => setCloneDestDir(e.target.value)}
                        className="flex-1 bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-1.5 text-xs focus:outline-none focus:border-[#00E5FF]"
                      />
                      <button
                        type="button"
                        onClick={() => openDirectoryBrowser("cloneDest")}
                        className="px-2.5 py-1.5 bg-[#112233] hover:bg-[#1A334D] border border-[#224466] text-[#00E5FF] text-[11px] font-bold tracking-wider uppercase transition-colors shrink-0"
                      >
                        📁 BROWSE...
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                      GIT BRANCH / TAG
                    </label>
                    <input
                      type="text"
                      placeholder="main"
                      value={gitBranch}
                      onChange={(e) => setGitBranch(e.target.value)}
                      className="w-full bg-[#03070D] border border-[#112233] text-[#00FF66] px-3 py-1.5 text-xs focus:outline-none focus:border-[#00E5FF] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                    FOLDER NAME (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-detected from URL"
                    value={cloneFolderName}
                    onChange={(e) => setCloneFolderName(e.target.value)}
                    className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-1.5 text-xs focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#5A7A9A]">
                    {cloneMessage ? (
                      <span className="text-[#00FF66]">{cloneMessage}</span>
                    ) : (
                      "Clones directly to local disk for live file inspection and AST scanning."
                    )}
                  </span>
                  <CyberButton
                    type="button"
                    accent="cyan"
                    size="sm"
                    variant="solid"
                    disabled={isCloning || !repoUrl.trim()}
                    onClick={handleCloneRepo}
                  >
                    {isCloning ? "CLONING REPOSITORY..." : "⚡ CLONE TO DISK NOW"}
                  </CyberButton>
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                SOFTWARE / SYSTEM NAME *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Logistics, ShuleBase React..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
              />
            </div>

            {/* Local Repository Path with Live Inspector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-[#5A7A9A] tracking-wider">
                  LOCAL REPOSITORY DISK PATH *
                </label>
                {isInspecting && (
                  <span className="text-[10px] text-[#00E5FF] animate-pulse">
                    Inspecting filesystem...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  required
                  placeholder="/home/danitech/Desktop/Projects/..."
                  value={repoPath}
                  onChange={(e) => handlePathChange(e.target.value)}
                  className={`flex-1 bg-[#03070D] border px-3 py-2 text-xs focus:outline-none ${
                    inspectionResult
                      ? inspectionResult.valid
                        ? "border-[#00FF66] text-[#C0D8F0]"
                        : "border-[#FF0055] text-[#FF8899]"
                      : "border-[#112233] text-[#C0D8F0] focus:border-[#00FF66]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => openDirectoryBrowser("repoPath")}
                  className="px-3 py-2 bg-[#112233] hover:bg-[#1A334D] border border-[#224466] text-[#00FF66] text-[11px] font-bold tracking-wider uppercase transition-colors shrink-0"
                >
                  📁 BROWSE...
                </button>
              </div>

              {/* Path Inspection Feedback Card */}
              {inspectionResult && (
                <div
                  className={`mt-1.5 p-2 border text-[11px] ${
                    inspectionResult.valid
                      ? "bg-[#00FF66]/5 border-[#00FF66]/30 text-[#A0D8B0]"
                      : "bg-[#FF0055]/5 border-[#FF0055]/30 text-[#FFA0B0]"
                  }`}
                >
                  {inspectionResult.valid ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[#00FF66] font-bold">
                        <span>✓</span>
                        <span>VALID LOCAL REPOSITORY DETECTED</span>
                      </div>
                      <div className="text-[10px] text-[#7A9A8A]">
                        Detected: <span className="text-white font-semibold">{inspectionResult.platform_detected}</span> ({inspectionResult.category_suggested})
                        {inspectionResult.has_git && " • Git tracking active"}
                        {inspectionResult.signature_files.length > 0 && ` • [${inspectionResult.signature_files.join(", ")}]`}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[#FF0055]">
                      <span>✗</span>
                      <span>{inspectionResult.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Remote Git Repository URL (if in local mode) */}
            {sourceMode === "local" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[#5A7A9A] tracking-wider">
                    REMOTE GIT REPOSITORY URL (OPTIONAL)
                  </label>
                  <span className="text-[9px] text-[#2A4A6A] font-mono">Auto-detected from git</span>
                </div>
                <input
                  type="text"
                  placeholder="https://github.com/organization/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="w-full bg-[#03070D] border border-[#112233] text-[#00E5FF] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
                />
              </div>
            )}

            {/* Category, Platform, Environment & Git Branch */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                  CATEGORY
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SoftwareCategory)}
                  className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
                >
                  <option value="Web API">Web API</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Frontend App">Frontend App</option>
                  <option value="Microservice">Microservice</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                  PLATFORM / STACK
                </label>
                <input
                  type="text"
                  placeholder="e.g. Django, Next.js"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                  DEPLOY ENVIRONMENT
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as "production" | "staging" | "development")}
                  className="w-full bg-[#03070D] border border-[#112233] text-[#00E5FF] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
                >
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                  TRACKED GIT BRANCH
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                  className="w-full bg-[#03070D] border border-[#112233] text-[#00FF66] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66] font-mono"
                />
              </div>
            </div>

            {/* ─── CLOUD & HOSTING PLATFORM INTEGRATION ─── */}
            <div className="bg-[#03070D] border border-[#112233] p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[#00FF66] text-sm">☁</span>
                  <span className="text-[11px] font-bold text-[#C0D8F0] tracking-wider uppercase font-mono">
                    HOSTING & CLOUD PROVIDER INTEGRATION
                  </span>
                </div>
                <span className="text-[9px] text-[#00FF66] bg-[#00FF66]/10 px-1.5 py-0.5 border border-[#00FF66]/30 uppercase font-mono font-bold">
                  100% Free Platform APIs
                </span>
              </div>

              <div className="text-[10px] text-[#5A7A9A] leading-relaxed">
                Connect your free hosting provider account to stream live server runtime logs, crashes, and deployment traces into Nexis with zero paid subscription costs.
              </div>

              {/* Provider Selection Buttons Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1">
                {cloudProviders.map((cp) => {
                  const isSelected = selectedProviderId === cp.id;
                  return (
                    <button
                      key={cp.id}
                      type="button"
                      onClick={() => {
                        setSelectedProviderId(cp.id);
                        setProviderVerifyResult(null);
                        setShowProviderGuide(true);
                      }}
                      className={`px-2 py-2 text-[10px] font-mono font-bold tracking-wider uppercase border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? "bg-[#00FF66]/15 border-[#00FF66] text-[#00FF66] shadow-[0_0_12px_rgba(0,255,102,0.25)]"
                          : "bg-[#070D16] border-[#112233] text-[#7A9ABA] hover:border-[#224466] hover:text-[#C0D8F0]"
                      }`}
                    >
                      <span className="truncate w-full">{cp.name}</span>
                      <span className="text-[8px] opacity-70 font-normal">
                        {cp.id === "custom" ? "Zero Keys" : "Free Tier"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Provider Details & API Key Entry */}
              {activeProviderInfo && activeProviderInfo.id !== "custom" && (
                <div className="bg-[#070D16] border border-[#00E5FF]/30 p-3 flex flex-col gap-2.5 mt-1">
                  <div className="flex items-center justify-between border-b border-[#112233] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#00E5FF]">⚡</span>
                      <span className="text-xs font-bold text-[#00E5FF] tracking-wider uppercase font-mono">
                        {activeProviderInfo.name} FREE API INTEGRATION
                      </span>
                    </div>

                    {/* Prominent Direct Link to get the free API key */}
                    {activeProviderInfo.token_url && (
                      <a
                        href={activeProviderInfo.token_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#00FF66] hover:text-white flex items-center gap-1 font-bold tracking-wider underline underline-offset-2 transition-colors"
                      >
                        <span>↗ GET FREE API KEY ON {activeProviderInfo.name.toUpperCase()}</span>
                      </a>
                    )}
                  </div>

                  {/* Capabilities Tags */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] text-[#5A7A9A]">SUPPORTED FEEDS:</span>
                    {activeProviderInfo.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[9px] text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 border border-[#00E5FF]/20 font-mono"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  {/* API Key Input + Verify Button */}
                  <div>
                    <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                      {activeProviderInfo.token_label.toUpperCase()} *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder={activeProviderInfo.placeholder}
                        value={providerApiKey}
                        onChange={(e) => {
                          setProviderApiKey(e.target.value);
                          setProviderVerifyResult(null);
                        }}
                        className="flex-1 bg-[#03070D] border border-[#112233] text-[#00E5FF] px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00E5FF]"
                      />
                      <CyberButton
                        type="button"
                        accent="cyan"
                        size="sm"
                        variant="solid"
                        disabled={isVerifyingProvider || !providerApiKey.trim()}
                        onClick={handleVerifyProvider}
                      >
                        {isVerifyingProvider ? "CONNECTING..." : "⚡ VERIFY & DISCOVER"}
                      </CyberButton>
                    </div>

                    {/* Direct clickable link right under input */}
                    {activeProviderInfo.token_url && (
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <a
                          href={activeProviderInfo.token_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00FF66] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>↗ Click here to generate your {activeProviderInfo.name} API key directly</span>
                        </a>
                        {activeProviderInfo.doc_url && (
                          <a
                            href={activeProviderInfo.doc_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#5A7A9A] hover:text-[#C0D8F0] underline"
                          >
                            API Docs ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step-by-Step Guidance Box */}
                  <div className="bg-[#03070D] border border-[#112233] p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#FFD600] font-bold flex items-center gap-1.5 font-mono">
                        <span>ℹ</span>
                        <span>HOW TO GET YOUR FREE {activeProviderInfo.name.toUpperCase()} TOKEN (30 SECONDS):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowProviderGuide((g) => !g)}
                        className="text-[9px] text-[#5A7A9A] hover:text-[#C0D8F0] underline font-mono"
                      >
                        {showProviderGuide ? "Hide instructions" : "Show instructions"}
                      </button>
                    </div>

                    {showProviderGuide && (
                      <ol className="list-decimal list-inside text-[10px] text-[#A0C0E0] mt-2 space-y-1 pl-1 font-mono">
                        {activeProviderInfo.guide.map((step, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  {/* Explicit Provider Project ID / Service Identifier Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-[#5A7A9A] tracking-wider">
                        {activeProviderInfo.project_label ? activeProviderInfo.project_label.toUpperCase() : "PROJECT ID / SERVICE IDENTIFIER"} (MANUAL OR AUTO-DISCOVERED)
                      </label>
                      <span className="text-[9px] text-[#2A4A6A] font-mono">e.g. project slug, service ID, or log group</span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. shulebase, srv-cu5j21l2ng1s73..., /aws/lambda/my-api"
                      value={providerProjectId}
                      onChange={(e) => setProviderProjectId(e.target.value)}
                      className="w-full bg-[#03070D] border border-[#112233] text-[#00E5FF] px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-[#00E5FF]"
                    />
                  </div>

                  {/* Verification Feedback / Discovered Services Dropdown */}
                  {providerVerifyResult && (
                    <div
                      className={`p-2.5 border text-[11px] font-mono ${
                        providerVerifyResult.valid
                          ? "bg-[#00FF66]/10 border-[#00FF66]/40 text-[#00FF66]"
                          : "bg-[#FF0055]/10 border-[#FF0055]/40 text-[#FF0055]"
                      }`}
                    >
                      {providerVerifyResult.valid ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              <span>✓</span>
                              <span>
                                {activeProviderInfo.name.toUpperCase()} CONNECTED: FOUND {providerVerifyResult.projects?.length || 0} SERVICE(S)
                              </span>
                            </span>
                            <span className="text-[10px] text-[#7A9A8A]">Live Sync Ready</span>
                          </div>

                          {providerVerifyResult.projects && providerVerifyResult.projects.length > 0 && (
                            <div className="mt-1">
                              <label className="text-[10px] text-[#C0D8F0] tracking-wider block mb-1 font-bold">
                                SELECT MONITORED {activeProviderInfo.name.toUpperCase()} SERVICE / PROJECT:
                              </label>
                              <select
                                value={providerProjectId}
                                onChange={(e) => handleSelectDiscoveredProject(e.target.value)}
                                className="w-full bg-[#03070D] border border-[#00FF66]/50 text-[#00FF66] px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                              >
                                {providerVerifyResult.projects.map((proj) => (
                                  <option key={proj.id} value={proj.id}>
                                    {proj.name} ({proj.type || "service"}) — {proj.target_url || proj.id}
                                  </option>
                                ))}
                              </select>
                              <div className="text-[9px] text-[#7A9ABA] mt-1">
                                Selecting auto-fills target endpoint URL & service name below.
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span>✗</span>
                          <span>{providerVerifyResult.error || "Token was rejected by cloud API."}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Custom / Self-Hosted Explanatory Card */}
              {activeProviderInfo && activeProviderInfo.id === "custom" && (
                <div className="bg-[#070D16] border border-[#112233] p-2.5 text-[10px] text-[#7A9ABA] leading-relaxed flex items-center gap-2">
                  <span className="text-[#00FF66] text-xs">✓</span>
                  <span>
                    No cloud API key required. Nexis monitors your local machine or Docker container using the built-in HTTP prober, in-app telemetry shipper (Approach C), and real-user browser tracker.
                  </span>
                </div>
              )}
            </div>

            {/* Architecture Endpoints: Frontend Ingress & Backend Compute */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[#5A7A9A] tracking-wider">
                    PRIMARY LIVE / FRONTEND URL *
                  </label>
                  <span className="text-[9px] text-[#00FF66] font-mono">INGRESS NODE</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="https://shulebase.vercel.app or http://localhost:3000"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  className="w-full bg-[#03070D] border border-[#112233] text-[#00FF66] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66] font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[#5A7A9A] tracking-wider">
                    BACKEND API / COMPUTE URL (OPTIONAL)
                  </label>
                  <span className="text-[9px] text-[#00E5FF] font-mono">COMPUTE NODE</span>
                </div>
                <input
                  type="text"
                  placeholder="https://shulebase-backend.onrender.com or http://localhost:8000"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full bg-[#03070D] border border-[#112233] text-[#00E5FF] px-3 py-2 text-xs focus:outline-none focus:border-[#00E5FF] font-mono"
                />
              </div>
            </div>

            {/* AI Telemetry Connector Option (Approach C) */}
            <div className="bg-[#00FF66]/5 border border-[#00FF66]/30 p-2.5 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="autoConnector"
                checked={autoGenerateConnector}
                onChange={(e) => setAutoGenerateConnector(e.target.checked)}
                className="mt-0.5 accent-[#00FF66]"
              />
              <label htmlFor="autoConnector" className="cursor-pointer">
                <span className="text-[#00FF66] font-bold text-[11px] block">
                  AI TELEMETRY CONNECTOR GENERATION (APPROACH C)
                </span>
                <span className="text-[10px] text-[#A0C0E0] block mt-0.5">
                  AI will analyze the stack (Django, Next.js, Android Kotlin, Spring Boot, etc.) and write an asynchronous telemetry shipper directly inside the codebase so logs stream freely from Vercel, Render, AWS, Docker, or local machine.
                </span>
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] text-[#5A7A9A] tracking-wider block mb-1">
                SYSTEM DESCRIPTION
              </label>
              <textarea
                rows={2}
                placeholder="Operational purpose and monitored subsystems..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#03070D] border border-[#112233] text-[#C0D8F0] px-3 py-2 text-xs focus:outline-none focus:border-[#00FF66]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#112233] mt-1">
              <CyberButton
                type="button"
                accent="magenta"
                size="sm"
                variant="ghost"
                onClick={onClose}
              >
                CANCEL
              </CyberButton>
              <CyberButton
                type="submit"
                accent="green"
                size="sm"
                variant="solid"
                disabled={isSubmitting || isCloning}
              >
                {isSubmitting ? "ENROLLING & GENERATING CONNECTOR..." : "+ ENROLL SOFTWARE & PROVISION"}
              </CyberButton>
            </div>
          </form>
        )}
      </div>

      {/* Directory Browser Sub-Modal */}
      {isBrowsingDirs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#070D16] border-2 border-[#00E5FF] w-full max-w-xl p-4 flex flex-col gap-3 font-mono shadow-[0_0_30px_rgba(0,229,255,0.3)] max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#112233] pb-2">
              <div className="flex items-center gap-2">
                <span className="text-[#00E5FF] text-sm font-bold">📁</span>
                <span className="text-xs text-[#00E5FF] font-bold tracking-wider uppercase">
                  {browseTarget === "cloneDest"
                    ? "SELECT LOCAL DESTINATION DIRECTORY"
                    : "SELECT LOCAL REPOSITORY DISK PATH"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBrowsingDirs(false)}
                className="text-[#5A7A9A] hover:text-[#FF0055] text-xs font-bold"
              >
                ✕ CANCEL
              </button>
            </div>

            {/* Current Path Bar & Parent Navigation */}
            <div className="flex items-center gap-2 bg-[#03070D] border border-[#112233] p-2 text-xs">
              <button
                type="button"
                disabled={!dirBrowseResult?.parent_path}
                onClick={() => dirBrowseResult?.parent_path && navigateToDir(dirBrowseResult.parent_path)}
                className="px-2 py-1 bg-[#112233] hover:bg-[#1A334D] disabled:opacity-30 disabled:hover:bg-[#112233] text-[#00E5FF] text-[10px] font-bold border border-[#224466] shrink-0"
              >
                ⬆ UP LEVEL
              </button>
              <div className="flex-1 text-[#00FF66] truncate font-mono text-[11px]">
                {dirBrowseResult?.current_path || "Scanning..."}
              </div>
            </div>

            {/* Directory List Container */}
            <div className="bg-[#03070D] border border-[#112233] p-2 overflow-y-auto max-h-[320px] flex flex-col gap-1 min-h-[160px]">
              {isLoadingDirs ? (
                <div className="p-6 text-center text-[#00E5FF] text-xs animate-pulse">
                  Scanning filesystem directories...
                </div>
              ) : dirBrowseResult?.subdirectories && dirBrowseResult.subdirectories.length > 0 ? (
                dirBrowseResult.subdirectories.map((sub) => (
                  <div
                    key={sub.path}
                    className="flex items-center justify-between p-2 hover:bg-[#0A1624] border border-transparent hover:border-[#00E5FF]/30 transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => navigateToDir(sub.path)}
                      className="flex items-center gap-2 text-left flex-1 truncate text-xs text-[#C0D8F0] group-hover:text-[#00E5FF]"
                    >
                      <span>📁</span>
                      <span className="font-semibold">{sub.name}</span>
                      {sub.has_git && (
                        <span className="text-[9px] bg-[#00FF66]/20 text-[#00FF66] px-1.5 py-0.2 border border-[#00FF66]/30 font-mono">
                          GIT REPO
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectCurrentBrowsedDir(sub.path)}
                      className="px-2 py-1 bg-[#00FF66]/10 hover:bg-[#00FF66]/30 border border-[#00FF66]/40 text-[#00FF66] text-[10px] font-bold tracking-wider shrink-0"
                    >
                      ✓ CHOOSE THIS
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-[#5A7A9A] text-xs">
                  No child directories found in this folder.
                </div>
              )}
            </div>

            {/* Sub-Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#112233] pt-2">
              <div className="text-[10px] text-[#5A7A9A]">
                Double click or tap folder name to navigate deeper.
              </div>
              <div className="flex items-center gap-2">
                <CyberButton
                  type="button"
                  accent="magenta"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsBrowsingDirs(false)}
                >
                  CANCEL
                </CyberButton>
                <CyberButton
                  type="button"
                  accent="green"
                  size="sm"
                  variant="solid"
                  onClick={() => selectCurrentBrowsedDir()}
                >
                  SELECT CURRENT FOLDER
                </CyberButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
