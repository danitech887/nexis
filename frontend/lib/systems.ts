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

export const MONITORED_SYSTEMS: MonitoredSystem[] = [
  {
    id: "auth-svc",
    name: "Auth Service",
    tag: "AUTH-01",
    category: "service",
    env: "production",
    host: "10.0.4.12",
    port: 8080,
    region: "us-east-1a",
    status: "online",
    healthScore: 98,
    logRate: "185 lps",
    uptime: "99.98%",
    version: "v2.14.1",
    description: "OAuth2 / OIDC token issuance, JWT verification, and MFA validator.",
    sampleLogs: {
      info: [
        "JWT token validated successfully for sub=usr_8841 (exp: 3600s)",
        "OIDC discovery endpoint requested by client gateway-edge",
        "OAuth2 exchange code granted for client web-client-prod",
        "Session extended for principal user:danitech session_id=s-9941",
        "Key rotation heartbeat: active key ID k-rsa-2026-b",
        "MFA challenge confirmed via WebAuthn/FIDO2 for usr_1042",
      ],
      warn: [
        "Unrecognized client certificate thumbprint; falling back to bearer token",
        "Token refresh took 480ms (p95 threshold exceeded: 300ms)",
        "Consecutive failed password attempts: 3 for user test_account_01",
      ],
      error: [
        "JWT signature verification failed: invalid RS256 signature from 192.168.1.104",
        "Token store Redis replica unreachable on tcp://10.0.4.55:6379",
        "Failed to load JWKS keyset from remote authority",
      ],
      debug: [
        "bcrypt hash computation finished in 64ms for salt_rounds=12",
        "Revocation cache hit for jti=4f92-a812",
        "Scoped permissions evaluated: read:logs, write:remediation",
      ],
      trace: [
        "Parsing Authorization header: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        "TLS handshake cipher suite: TLS_AES_256_GCM_SHA384",
      ],
    },
    analysis: {
      avgLatency: "18ms",
      p99Latency: "84ms",
      throughput: "3,200 req/s",
      errorRate: "0.04%",
      memoryUsage: "612 MB / 2 GB",
      cpuUsage: "28%",
      insights: [
        "Token verification throughput increased 14% following ECDSA optimizations.",
        "Zero session evictions in Redis cache over the past 24 hours.",
        "Peak traffic observed around 08:00 - 10:00 UTC during regional morning logins.",
      ],
    },
    debugging: {
      activeThreads: 16,
      openSockets: 342,
      heapAllocated: "512 MB",
      gcPauseAvg: "1.4ms",
      recentStackTraces: [
        {
          id: "ST-AUTH-01",
          timestamp: "09:33:17",
          error: "AuthenticationError: JWT signature verification failed",
          location: "jwt.strategy.ts:66",
          stack: [
            "  at JwtStrategy.validate (jwt.strategy.ts:66)",
            "  at AuthGuard.canActivate (auth.guard.ts:31)",
            "  at Router.handle (express/router.js:144)",
          ],
        },
      ],
      probes: [
        { name: "JWKS Endpoint Health", status: "passing", latency: "6ms" },
        { name: "Redis Token Blacklist", status: "passing", latency: "1.2ms" },
        { name: "PostgreSQL User Store", status: "passing", latency: "3.4ms" },
      ],
    },
    recommendations: [
      {
        id: "REC-AUTH-01",
        title: "Migrate JWT Verification from RS256 to Ed25519",
        severity: "medium",
        category: "Performance",
        impact: "Reduces token validation CPU load by ~40% across edge clusters.",
        suggestedFix: "Update token signing algorithm config in auth-svc.conf to EdDSA/Ed25519.",
        autoFixable: false,
      },
      {
        id: "REC-AUTH-02",
        title: "Increase Redis Connection Pool Size",
        severity: "low",
        category: "Reliability",
        impact: "Prevents token cache socket contention during traffic surges.",
        suggestedFix: "Adjust REDIS_MAX_CONNECTIONS from 50 to 128.",
        autoFixable: true,
      },
    ],
    issues: [
      {
        id: "ISS-AUTH-01",
        title: "Occasional JWT signature verification rejection during key rotation",
        severity: "high",
        time: "09:49:55",
        status: "investigating",
        description: "Old JWKS public keys cached for 15 minutes before refreshing new rotation key.",
      },
    ],
  },
  {
    id: "payment-api",
    name: "Payment API",
    tag: "PAY-02",
    category: "service",
    env: "production",
    host: "10.0.5.20",
    port: 3000,
    region: "us-east-1b",
    status: "online",
    healthScore: 92,
    logRate: "310 lps",
    uptime: "99.95%",
    version: "v3.8.0",
    description: "Financial transactions, payment gateway integrations, and ledger reconciliations.",
    sampleLogs: {
      info: [
        "Payment intent created: pi_3Nx1489 amount=4990 currency=usd status=requires_capture",
        "Webhook captured from Stripe: charge.succeeded id=ch_9934",
        "Ledger reconciliation completed: batch_id=b_7719 matched 450/450 transactions",
        "PCI-DSS audit log entry written to immutable vault bucket",
        "Refund processed for tx_3301 reason=requested_by_customer",
        "3D Secure v2 authentication passed for card ************4242",
      ],
      warn: [
        "Payment gateway latency elevated: 1,840ms for upstream processor",
        "Missing optional metadata 'customer_tax_id' in checkout payload",
        "Retry attempt 2/3 for outbound webhook endpoint to client partner",
      ],
      error: [
        "Card declined: generic_decline for customer cus_991823",
        "Idempotency conflict: key 'req_idempotent_991' locked by concurrent worker",
        "Upstream banking gateway returned HTTP 504 Gateway Timeout",
      ],
      debug: [
        "Sanitizing PCI payload: masked 16 card numbers before logging",
        "Idempotency token stored in Redis TTL=86400s",
        "Currency conversion rates fetched: 1 USD = 0.92 EUR",
      ],
      trace: [
        "Dispatching POST /v1/charges to https://api.stripe.com",
        "Payload digest SHA256: 3c9b1f...",
      ],
    },
    analysis: {
      avgLatency: "142ms",
      p99Latency: "410ms",
      throughput: "1,450 tx/min",
      errorRate: "0.82%",
      memoryUsage: "1.4 GB / 4 GB",
      cpuUsage: "45%",
      insights: [
        "Payment webhook processing latency has normalized after upstream patch.",
        "Idempotency collision rate is low (<0.02% of all API calls).",
        "Failed charges predominantly attributed to cardholder insufficient funds.",
      ],
    },
    debugging: {
      activeThreads: 32,
      openSockets: 180,
      heapAllocated: "1.1 GB",
      gcPauseAvg: "2.8ms",
      recentStackTraces: [
        {
          id: "ST-PAY-01",
          timestamp: "09:47:39",
          error: "ValidationError: Missing required field 'currency' in payment payload",
          location: "validator.ts:55",
          stack: [
            "  at PayloadValidator.validate (validator.ts:55)",
            "  at POST /api/charge (route.ts:28)",
            "  at Layer.handle [as handle_request] (router/layer.js:95)",
          ],
        },
      ],
      probes: [
        { name: "Stripe Gateway Egress", status: "passing", latency: "112ms" },
        { name: "Idempotency Cache", status: "passing", latency: "0.8ms" },
        { name: "Ledger DB Proxy", status: "passing", latency: "4.1ms" },
      ],
    },
    recommendations: [
      {
        id: "REC-PAY-01",
        title: "Enable Exponential Backoff with Jitter on Upstream Webhooks",
        severity: "high",
        category: "Reliability",
        impact: "Prevents thundering herd retries during third-party gateway hiccups.",
        suggestedFix: "Configure retry strategy to exponential jitter with max 5 attempts.",
        autoFixable: true,
      },
      {
        id: "REC-PAY-02",
        title: "Automate Parameterized Sanitization for Custom Meta Fields",
        severity: "medium",
        category: "Security",
        impact: "Protects backend SQL query builder from injection attempts via metadata fields.",
        suggestedFix: "Enforce JSON schema strict validation on metadata payloads.",
        autoFixable: false,
      },
    ],
    issues: [
      {
        id: "ISS-PAY-01",
        title: "Intermittent timeout on third-party settlement queries",
        severity: "medium",
        time: "09:44:12",
        status: "open",
        description: "Upstream partner settlement API takes >3.5s to respond during midday window.",
      },
    ],
  },
  {
    id: "db-proxy",
    name: "DB Cluster Proxy",
    tag: "DB-03",
    category: "database",
    env: "production",
    host: "10.0.8.4",
    port: 3306,
    region: "us-east-1a",
    status: "warn",
    healthScore: 74,
    logRate: "520 lps",
    uptime: "99.91%",
    version: "v4.2.1",
    description: "Connection pool multiplexer, read/write query router, and replication monitor.",
    sampleLogs: {
      info: [
        "Client acquired connection from pool #2 (active: 18/20)",
        "Routed read query to replica shard-02 (replication lag: 4ms)",
        "Write transaction committed in 6.2ms on primary node master-01",
        "Prepared statement cache hit for hash=0x39a8ff",
        "Connection returned to pool; idle connection count: 2",
        "Vacuum analyze job completed on table 'audit_events'",
      ],
      warn: [
        "Connection pool reaching capacity: 19/20 allocated",
        "Slow query detected (640ms): SELECT * FROM logs WHERE ts > NOW() - INTERVAL 7 DAY",
        "Replication lag on read-replica-03 elevated to 142ms",
        "Table 'session_store' dead tuple count exceeds 25,000",
      ],
      error: [
        "Connection pool exhausted — max 20 connections reached for tenant-4",
        "Deadlock detected on lock key 'idx_user_wallets': transaction aborted",
        "SQL query timeout after 5000ms: SELECT SUM(amount) FROM payments",
      ],
      debug: [
        "Query router: parsing AST for read-only hint",
        "Connection health probe OK: ping master in 0.4ms",
        "Buffer cache hit ratio: 98.4%",
      ],
      trace: [
        "TCP keepalive packet sent to 10.0.8.101:5432",
        "Socket recv: 124 bytes PG_RESULT_READY",
      ],
    },
    analysis: {
      avgLatency: "4.2ms",
      p99Latency: "148ms",
      throughput: "8,900 qps",
      errorRate: "1.4%",
      memoryUsage: "6.8 GB / 8 GB",
      cpuUsage: "78%",
      insights: [
        "Pool saturation occurs whenever batch reconciliation workers execute simultaneously.",
        "Primary node CPU spikes correspond with complex unindexed analytics queries.",
        "Read replicas are absorbing 82% of all SELECT traffic successfully.",
      ],
    },
    debugging: {
      activeThreads: 48,
      openSockets: 890,
      heapAllocated: "4.8 GB",
      gcPauseAvg: "0.9ms",
      recentStackTraces: [
        {
          id: "ST-DB-01",
          timestamp: "09:12:04",
          error: "DatabaseError: Connection pool exhausted — max 20 connections reached",
          location: "pool.js:142",
          stack: [
            "  at ConnectionPool.acquire (pool.js:142)",
            "  at QueryRunner.connect (runner.js:78)",
            "  at PaymentService.processCharge (payment.ts:234)",
          ],
        },
      ],
      probes: [
        { name: "Primary Master Socket", status: "passing", latency: "0.4ms" },
        { name: "Replica Shard 01", status: "passing", latency: "0.6ms" },
        { name: "Replica Shard 02", status: "passing", latency: "0.5ms" },
        { name: "Pool Capacity Reserve", status: "failing", latency: "22ms" },
      ],
    },
    recommendations: [
      {
        id: "REC-DB-01",
        title: "Scale Connection Pool Capacity from 20 to 60",
        severity: "critical",
        category: "Reliability",
        impact: "Eliminates pool exhaustion bottlenecks and connection wait queues under peak loads.",
        suggestedFix: "Update db-proxy.json pool_max_size to 60 with connection timeout of 3000ms.",
        autoFixable: true,
      },
      {
        id: "REC-DB-02",
        title: "Add Composite Index on logs(created_at, system_id)",
        severity: "high",
        category: "Performance",
        impact: "Reduces slow query latency from 640ms down to 12ms for audit lookups.",
        suggestedFix: "Execute CREATE INDEX CONCURRENTLY idx_logs_sys_ts ON logs (system_id, created_at DESC);",
        autoFixable: false,
      },
    ],
    issues: [
      {
        id: "ISS-DB-01",
        title: "Connection pool exhaustion under concurrent API spikes",
        severity: "critical",
        time: "09:31:55",
        status: "open",
        description: "Max 20 connection limit reached during payments and batch worker execution.",
      },
    ],
  },
  {
    id: "cdn-edge",
    name: "CDN Edge Network",
    tag: "CDN-04",
    category: "cdn",
    env: "production",
    host: "10.0.12.8",
    port: 443,
    region: "global-anycast",
    status: "online",
    healthScore: 99,
    logRate: "1,240 lps",
    uptime: "99.99%",
    version: "v1.19.4",
    description: "Anycast edge cache, TLS termination, WAF DDoS filtering, and static asset distribution.",
    sampleLogs: {
      info: [
        "Edge cache HIT: 200 GET /assets/cyber-grid.svg size=4.2KB from edge-iad1",
        "TLS 1.3 session resumed for client 74.125.210.19 with 0-RTT",
        "Brotli compression applied: saved 68% payload on bundle.min.js",
        "WAF rule #104 checked: HTTP request verified clean",
        "Edge cache MISS: fetching /api/vitals from origin origin-cluster-01",
        "HTTP/3 QUIC connection established with client mobile-app-ios",
      ],
      warn: [
        "Origin response time 420ms exceeds edge threshold target 200ms",
        "SSL certificate expires in 14 days for *.devcore.nexis.io",
        "Cache eviction rate elevated in edge POP fra-01 due to large binary push",
      ],
      error: [
        "WAF blocked malicious payload: SQLi pattern detected from IP 185.220.101.4",
        "Origin upstream connection timeout on backend server 10.0.4.12:8080",
        "TLS handshake failed: client unsupported cipher suite",
      ],
      debug: [
        "GeoIP resolver: IP mapped to United States / Virginia (AS15169)",
        "Edge worker route matched: rewrite /v1/* to origin gateway",
        "Cache-Control parsed: public, max-age=86400, stale-while-revalidate=3600",
      ],
      trace: [
        "QUIC stream frame #4 received length=512",
        "Anycast BGP route preference AS_PATH [13335, 15169]",
      ],
    },
    analysis: {
      avgLatency: "6.8ms",
      p99Latency: "38ms",
      throughput: "24,500 req/s",
      errorRate: "0.01%",
      memoryUsage: "3.2 GB / 16 GB",
      cpuUsage: "19%",
      insights: [
        "Cache hit ratio holds strong at 94.6% across all global edge points of presence.",
        "WAF blocked 1,420 automated scanner probes in the last 6 hours.",
        "HTTP/3 QUIC adoption represents 62% of incoming traffic.",
      ],
    },
    debugging: {
      activeThreads: 64,
      openSockets: 14200,
      heapAllocated: "2.8 GB",
      gcPauseAvg: "0.4ms",
      recentStackTraces: [],
      probes: [
        { name: "Anycast DNS Probe", status: "passing", latency: "2.1ms" },
        { name: "Origin Ping (IAD)", status: "passing", latency: "4.8ms" },
        { name: "WAF Rule Engine", status: "passing", latency: "0.3ms" },
      ],
    },
    recommendations: [
      {
        id: "REC-CDN-01",
        title: "Automate ACME Let's Encrypt Certificate Renewal",
        severity: "medium",
        category: "Security",
        impact: "Eliminates certificate expiration risk within 14 days.",
        suggestedFix: "Trigger cert-manager auto-renewal hook.",
        autoFixable: true,
      },
    ],
    issues: [],
  },
  {
    id: "queue-worker",
    name: "Queue Worker Cluster",
    tag: "QW-05",
    category: "worker",
    env: "production",
    host: "10.0.6.15",
    port: 6379,
    region: "us-east-1a",
    status: "online",
    healthScore: 94,
    logRate: "280 lps",
    uptime: "99.96%",
    version: "v2.6.0",
    description: "Asynchronous task queue processor, scheduled cron runners, and notification dispatcher.",
    sampleLogs: {
      info: [
        "Job started: job_id=mail_9941 type=send_welcome_email priority=normal",
        "Job completed successfully in 410ms: mail_9941",
        "Batch of 50 webhook notification dispatches succeeded",
        "Queue heartbeat: 0 stale locks detected across workers 1..8",
        "Scheduled cron fired: telemetry_rollup_hourly",
        "Worker instance worker-node-04 spawned and joined pool",
      ],
      warn: [
        "Queue depth increasing: 3,420 pending jobs in queue 'notifications'",
        "Worker memory consumption reached 78% (threshold 80%)",
        "Job job_id=report_331 took longer than expected: 8,400ms",
      ],
      error: [
        "Job failed: job_id=sync_stripe_41 error='Network unreachable: 504'",
        "Worker process 2102 killed by OOM killer; reviving replacement worker",
        "Max retry attempts (5) exhausted for job_id=webhook_dlq_09",
      ],
      debug: [
        "Polling queue 'high_priority' with timeout 2000ms",
        "Job payload deserialized in 1.1ms (size: 4.8KB)",
        "Lock extended on job_id=batch_calc_12 TTL=30s",
      ],
      trace: [
        "BRPOP high_priority, default, low 2",
        "Worker heartbeat ping to coordinator",
      ],
    },
    analysis: {
      avgLatency: "65ms",
      p99Latency: "1.2s",
      throughput: "920 jobs/min",
      errorRate: "0.34%",
      memoryUsage: "3.4 GB / 4 GB",
      cpuUsage: "62%",
      insights: [
        "Background job latency is within acceptable tolerance except for third-party syncs.",
        "Notification queue experiences short spikes during marketing campaign sends.",
        "Dead letter queue (DLQ) currently contains 7 unresolvable messages.",
      ],
    },
    debugging: {
      activeThreads: 18,
      openSockets: 94,
      heapAllocated: "2.9 GB",
      gcPauseAvg: "3.2ms",
      recentStackTraces: [
        {
          id: "ST-QW-01",
          timestamp: "09:31:02",
          error: "ProcessKilledError: Memory spike exceeded container threshold",
          location: "worker-pool.ts:208",
          stack: [
            "  at WorkerPool.onProcessExit (worker-pool.ts:208)",
            "  at ChildProcess.emit (events.js:314)",
          ],
        },
      ],
      probes: [
        { name: "Redis Queue Broker", status: "passing", latency: "0.9ms" },
        { name: "Dead Letter Queue Monitor", status: "degraded", latency: "14ms" },
        { name: "Worker Concurrency Pool", status: "passing", latency: "1.8ms" },
      ],
    },
    recommendations: [
      {
        id: "REC-QW-01",
        title: "Scale Worker Nodes from 4 to 8 During Scheduled Spikes",
        severity: "medium",
        category: "Performance",
        impact: "Clears notification queue backlog 2.5x faster without memory saturation.",
        suggestedFix: "Enable auto-scaling HPA rule based on queue depth threshold > 2000.",
        autoFixable: true,
      },
      {
        id: "REC-QW-02",
        title: "Isolate High-Memory Batch Reports to Dedicated Worker Subpool",
        severity: "low",
        category: "Reliability",
        impact: "Prevents OOM crashes from impacting real-time notification jobs.",
        suggestedFix: "Route report generation jobs to queue:heavy_reports.",
        autoFixable: false,
      },
    ],
    issues: [
      {
        id: "ISS-QW-01",
        title: "Memory spike in worker shard-03 (+42%)",
        severity: "high",
        time: "09:48:21",
        status: "investigating",
        description: "Heavy reporting aggregation job caused memory consumption surge.",
      },
    ],
  },
  {
    id: "search-eng",
    name: "Search Engine",
    tag: "SRCH-06",
    category: "search",
    env: "production",
    host: "10.0.9.18",
    port: 9200,
    region: "us-east-1a",
    status: "warn",
    healthScore: 68,
    logRate: "390 lps",
    uptime: "99.88%",
    version: "v8.11.0",
    description: "Elasticsearch vector and full-text index for product catalog and log intelligence.",
    sampleLogs: {
      info: [
        "Search query completed: index='catalog_v3' query='cyberpunk' hits=42 took=18ms",
        "Document indexed: id='doc_99184' in shard [catalog_v3][1]",
        "Cluster state: GREEN shards active=24 unassigned=0",
        "Flush completed on index 'telemetry_metrics_2026_10'",
        "Faceted aggregation computed for categories: 14 buckets in 8ms",
        "Snapshot backup to S3 bucket repository completed",
      ],
      warn: [
        "Garbage collection pause took 1,240ms on node search-data-02",
        "Heap usage at 82% — approaching critical threshold",
        "Fielddata cache size exceeded soft limit on field 'body_text'",
        "Slow search query detected (1,410ms) with fuzzy wildcard prefix",
      ],
      error: [
        "Upstream request to search-engine timed out after 5000ms",
        "Rejected execution: thread pool 'search' queue capacity (1000) reached",
        "CircuitBreakerException: [parent] Data too large, data for [<reused_arrays>] would be larger than limit",
      ],
      debug: [
        "Score calculation: BM25 k1=1.2 b=0.75 for query tokens",
        "Shard routing: query routed to primary shard 2 on node-01",
        "Segment merge completed: merged 4 segments into 1",
      ],
      trace: [
        "HTTP/1.1 POST /catalog_v3/_search?size=20",
        "Lucene segment reader opened generation=412",
      ],
    },
    analysis: {
      avgLatency: "68ms",
      p99Latency: "1,450ms",
      throughput: "2,100 queries/s",
      errorRate: "1.9%",
      memoryUsage: "14.2 GB / 16 GB",
      cpuUsage: "84%",
      insights: [
        "High P99 latency is driven by unconstrained wildcard queries without index filters.",
        "JVM heap pressure is recurring every 2 hours when segment merges coincide with batch indexing.",
        "Circuit breaker triggered twice today to prevent cluster crash.",
      ],
    },
    debugging: {
      activeThreads: 56,
      openSockets: 410,
      heapAllocated: "13.8 GB",
      gcPauseAvg: "410ms",
      recentStackTraces: [
        {
          id: "ST-SRCH-01",
          timestamp: "09:41:00",
          error: "TimeoutError: Upstream request to search-engine timed out after 5000ms",
          location: "http-client.ts:89",
          stack: [
            "  at axios.get timeout (http-client.ts:89)",
            "  at SearchService.query (search.ts:121)",
            "  at Router.handle (express/router.js:144)",
          ],
        },
      ],
      probes: [
        { name: "Cluster Health Status", status: "degraded", latency: "42ms" },
        { name: "JVM Heap Headroom", status: "failing", latency: "1.2s" },
        { name: "Index Write Buffer", status: "passing", latency: "6ms" },
      ],
    },
    recommendations: [
      {
        id: "REC-SRCH-01",
        title: "Disable Leading Wildcard Searches on Non-Keyword Fields",
        severity: "critical",
        category: "Performance",
        impact: "Halves P99 query latency and eliminates JVM thread pool queue exhaustion.",
        suggestedFix: "Enforce query validation middleware rejecting wildcard queries with `*` prefix.",
        autoFixable: false,
      },
      {
        id: "REC-SRCH-02",
        title: "Allocate 2 Additional Data Nodes to Shard Pool",
        severity: "high",
        category: "Reliability",
        impact: "Spreads heap usage across more instances, dropping memory pressure under 60%.",
        suggestedFix: "Spin up search-data-03 and search-data-04 via Kubernetes node pool.",
        autoFixable: true,
      },
    ],
    issues: [
      {
        id: "ISS-SRCH-01",
        title: "P99 search latency exceeds 1.4s SLA threshold",
        severity: "high",
        time: "09:44:07",
        status: "open",
        description: "Unoptimized search aggregations saturating heap and triggering GC pauses.",
      },
    ],
  },
  {
    id: "gateway-edge",
    name: "API Gateway",
    tag: "GW-07",
    category: "gateway",
    env: "production",
    host: "10.0.1.5",
    port: 443,
    region: "us-east-1a",
    status: "online",
    healthScore: 97,
    logRate: "890 lps",
    uptime: "99.99%",
    version: "v3.1.2",
    description: "Reverse proxy, rate limiting, TLS offloading, dynamic routing, and observability ingest.",
    sampleLogs: {
      info: [
        "Inbound request routed: GET /api/vitals -> backend auth-svc in 12ms",
        "Rate limit quota verified for client_id=c_910 (usage: 42/1000 rpm)",
        "CORS preflight request OPTIONS /api/pay accepted",
        "Distributed trace trace_id=4f92-003 propagated to downstream microservices",
        "Upstream health check: all 7 backend pools reporting healthy",
        "SSL session cache lookup successful",
      ],
      warn: [
        "Client 192.168.1.42 reached 90% of rate limit threshold",
        "Slow upstream response from backend search-eng: 1,410ms",
        "Payload size warning: request body 8.4MB exceeds optimal buffer 5MB",
      ],
      error: [
        "Rate limit exceeded (HTTP 429) for client IP 192.168.1.42",
        "Upstream connection refused on backend auth-svc-backup:8080",
        "Bad Gateway HTTP 502: backend dropped TCP connection abruptly",
      ],
      debug: [
        "JWT claims extracted: sub=usr_8841 roles=['admin', 'developer']",
        "Matched route rule: /api/v1/payments/* -> service:payment-api",
        "Header injected: X-Request-Id: 9f8a-4412-bc09",
      ],
      trace: [
        "Epoll event dispatch: 24 active sockets serviced",
        "HTTP/2 multiplexed stream id=11 frame=DATA length=1024",
      ],
    },
    analysis: {
      avgLatency: "3.4ms",
      p99Latency: "24ms",
      throughput: "18,200 req/s",
      errorRate: "0.12%",
      memoryUsage: "1.2 GB / 4 GB",
      cpuUsage: "32%",
      insights: [
        "Routing latency remains sub-5ms across 99% of requests.",
        "Rate limiting saved downstream services from 3 micro-bursts today.",
        "Dynamic upstream health checks diverted traffic seamlessly during backend updates.",
      ],
    },
    debugging: {
      activeThreads: 32,
      openSockets: 4800,
      heapAllocated: "980 MB",
      gcPauseAvg: "0.6ms",
      recentStackTraces: [],
      probes: [
        { name: "Upstream Route Registry", status: "passing", latency: "0.2ms" },
        { name: "Redis Rate Limiter", status: "passing", latency: "0.7ms" },
        { name: "TLS Termination Engine", status: "passing", latency: "1.1ms" },
      ],
    },
    recommendations: [
      {
        id: "REC-GW-01",
        title: "Enable Response Caching for Static Vitals & Health Endpoints",
        severity: "low",
        category: "Performance",
        impact: "Relieves backend services of 15% repetitive health probe traffic.",
        suggestedFix: "Set cache-control max-age=5 for /healthz endpoints in gateway.conf.",
        autoFixable: true,
      },
    ],
    issues: [],
  },
];

export function getSystemById(id: string): MonitoredSystem | undefined {
  return MONITORED_SYSTEMS.find((s) => s.id === id);
}
