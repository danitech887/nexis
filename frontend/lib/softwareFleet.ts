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

export const INITIAL_SOFTWARE_FLEET: SoftwareProject[] = [
  {
    id: "apex-logistics",
    name: "Apex Logistics",
    category: "Web API",
    platform: "Python / Django REST Framework",
    vitals: "OK",
    errorCount: 12,
    hasSpike: false,
    sastGrade: "B+",
    healthScore: 94,
    description: "Supply chain & logistics routing, freight invoicing, and carrier order dispatcher.",
    repoPath: "/home/danitech/Desktop/Projects/Apex Logistics & Supply Chain Ltd",
    lastDeployed: "2 hours ago",
    metrics: {
      cpu: "34%",
      memory: "1.2 GB",
      p99Latency: "112ms",
      activeSessions: "3,400 req/min",
    },
    scopedLogs: [
      { id: 1, ts: "12:15:02.102", level: "INFO", tag: "django.request", msg: "GET /api/v2/shipments/SHP-8891 status=200 42ms" },
      { id: 2, ts: "12:15:03.441", level: "INFO", tag: "celery.worker", msg: "Task logistics.tasks.reconcile_freight_invoices[f31a] completed" },
      { id: 3, ts: "12:15:08.891", level: "WARN", tag: "db.postgresql", msg: "Slow query detected (420ms): SELECT * FROM carrier_routes WHERE origin_zone = 'EU-WEST'" },
      { id: 4, ts: "12:15:14.201", level: "ERROR", tag: "payment.gateway", msg: "Stripe API webhook timeout on invoice INV-9041 retry=2" },
      { id: 5, ts: "12:15:19.094", level: "INFO", tag: "gunicorn.access", msg: "POST /api/v2/rates/quote client_ip=192.168.1.102 200 OK" },
    ],
    scopedCrashes: [
      {
        id: "CRASH-APX-01",
        title: "DatabaseOperationalError: Connection reset by peer during freight invoice export",
        severity: "high",
        count: 12,
        lastSeen: "12:14:22",
        location: "logistics/tasks/invoicing.py:84",
        stackTrace: [
          "  File \"logistics/tasks/invoicing.py\", line 84, in generate_pdf_manifest",
          "    cursor.execute(\"SELECT * FROM freight_records WHERE batch_id = %s\", [batch_id])",
          "  File \"django/db/backends/utils.py\", line 89, in execute",
          "django.db.utils.OperationalError: server closed the connection unexpectedly",
        ],
      },
    ],
    scopedSast: [
      {
        id: "SAST-APX-01",
        rule: "SQL Injection via Raw Query Concatenation",
        severity: "critical",
        file: "logistics/views/rates.py",
        line: 142,
        description: "Unescaped user parameter 'carrier_filter' passed to raw cursor query.",
        remediationSnippet: "CarrierRoute.objects.filter(carrier_code=carrier_filter)",
      },
      {
        id: "SAST-APX-02",
        rule: "Missing CSRF Token on Internal Webhook",
        severity: "medium",
        file: "api/webhooks.py",
        line: 38,
        description: "Endpoint uses @csrf_exempt without signature verification.",
        remediationSnippet: "Verify Stripe signature header using stripe.Webhook.construct_event",
      },
    ],
    astHighlight: {
      rootClass: "FreightRateCalculator",
      loc: 480,
      methods: [
        { name: "calculate_zone_toll()", complexity: 12, lines: 65 },
        { name: "apply_fuel_surcharge()", complexity: 6, lines: 34 },
        { name: "optimize_carrier_cost()", complexity: 18, lines: 110 },
      ],
    },
    aiFixSnippet: {
      title: "Replace Raw SQL with Django ORM Parameterization",
      file: "logistics/views/rates.py",
      diffBefore: `query = f"SELECT * FROM carrier_routes WHERE carrier = '{request.GET.get('carrier')}'"\nroutes = cursor.execute(query).fetchall()`,
      diffAfter: `routes = CarrierRoute.objects.filter(\n    carrier_id=request.GET.get('carrier'),\n    is_active=True\n).select_related('fleet_specs')`,
      tests: [
        { name: "test_rejects_sql_injection_payload", status: "pass" },
        { name: "test_returns_valid_carrier_routes", status: "pass" },
        { name: "test_handles_empty_carrier_param", status: "pass" },
      ],
    },
  },
  {
    id: "shulebase-android",
    name: "ShuleBase Android",
    category: "Mobile",
    platform: "Kotlin / Android Jetpack Compose",
    vitals: "Degraded",
    errorCount: 89,
    hasSpike: true,
    sastGrade: "B-",
    healthScore: 72,
    description: "School management mobile client: attendance, grades, fee receipts, and offline SQLite sync.",
    repoPath: "/home/danitech/Desktop/Projects/Android",
    lastDeployed: "Yesterday 18:30",
    metrics: {
      cpu: "68%",
      memory: "380 MB",
      p99Latency: "480ms",
      activeSessions: "1,240 DAU",
    },
    scopedLogs: [
      { id: 101, ts: "12:18:01.002", level: "WARN", tag: "Choreographer", msg: "Skipped 48 frames! The application may be doing too much work on its main thread." },
      { id: 102, ts: "12:18:04.210", level: "ERROR", tag: "ActivityManager", msg: "ANR in com.shulebase.app (com.shulebase.app/.ui.AttendanceActivity)" },
      { id: 103, ts: "12:18:04.212", level: "ERROR", tag: "ProcessCpuTracker", msg: "CPU usage: 98% TOTAL: 62% user + 36% kernel / com.shulebase.app: 84%" },
      { id: 104, ts: "12:18:09.114", level: "WARN", tag: "RoomSQLite", msg: "Disk I/O latency: writing 4,000 student records in single UI transaction" },
      { id: 105, ts: "12:18:12.890", level: "INFO", tag: "SyncWorker", msg: "WorkManager: Enqueued offline biometric attendance sync to remote server" },
      { id: 106, ts: "12:18:15.402", level: "ERROR", tag: "AndroidRuntime", msg: "FATAL EXCEPTION: main Process: com.shulebase.app, PID: 14890" },
    ],
    scopedCrashes: [
      {
        id: "CRASH-SHU-01",
        title: "ANR (Application Not Responding): Main thread blocked during Room DB bulk insert",
        severity: "critical",
        count: 67,
        lastSeen: "12:18:04",
        location: "com.shulebase.app.data.db.StudentDao_Impl:240",
        anrDetails: {
          blockedThread: "main (tid=1)",
          durationMs: 5400,
          trigger: "Broadcast of Intent { act=com.shulebase.SYNC_COMPLETED }",
        },
        stackTrace: [
          "  at android.database.sqlite.SQLiteConnection.nativeExecute(Native Method)",
          "  at android.database.sqlite.SQLiteConnection.execute(SQLiteConnection.java:620)",
          "  at com.shulebase.app.data.db.StudentDao_Impl.insertStudentsSync(StudentDao_Impl.java:240)",
          "  at com.shulebase.app.ui.attendance.AttendanceViewModel.persistRoster(AttendanceViewModel.kt:89)",
          "  at com.shulebase.app.ui.attendance.AttendanceActivity.onCreate(AttendanceActivity.kt:42)",
        ],
      },
      {
        id: "CRASH-SHU-02",
        title: "Fatal Exception: NetworkOnMainThreadException during emergency notice fetch",
        severity: "high",
        count: 22,
        lastSeen: "12:16:10",
        location: "com.shulebase.app.network.NoticeClient:58",
        stackTrace: [
          "  at android.os.StrictMode$AndroidBlockGuardPolicy.onNetwork(StrictMode.java:1605)",
          "  at java.net.SocketOutputStream.socketWrite(SocketOutputStream.java:115)",
          "  at com.shulebase.app.network.NoticeClient.fetchNotices(NoticeClient.kt:58)",
        ],
      },
    ],
    scopedSast: [
      {
        id: "SAST-SHU-01",
        rule: "Cleartext HTTP Traffic Permitted (network_security_config.xml)",
        severity: "high",
        file: "res/xml/network_security_config.xml",
        line: 8,
        description: "base-config cleartextTrafficPermitted is set to 'true', exposing credentials to Wi-Fi sniffing.",
        remediationSnippet: "<base-config cleartextTrafficPermitted=\"false\" />",
      },
      {
        id: "SAST-SHU-02",
        rule: "Insecure SharedPreferences Storage for Student Auth Token",
        severity: "critical",
        file: "data/pref/AuthPreferences.kt",
        line: 24,
        description: "JWT access token stored in unencrypted MODE_PRIVATE SharedPreferences.",
        remediationSnippet: "Use EncryptedSharedPreferences.create() from androidx.security.crypto",
      },
      {
        id: "SAST-SHU-03",
        rule: "Exported ContentProvider without Permissions",
        severity: "medium",
        file: "AndroidManifest.xml",
        line: 62,
        description: "com.shulebase.app.data.FileProvider has android:exported=\"true\" without permission check.",
        remediationSnippet: "Set android:exported=\"false\" and enable android:grantUriPermissions=\"true\"",
      },
    ],
    astHighlight: {
      rootClass: "AttendanceViewModel",
      loc: 340,
      methods: [
        { name: "persistRoster()", complexity: 16, lines: 72 },
        { name: "syncWithCloud()", complexity: 9, lines: 45 },
        { name: "filterByClassGrade()", complexity: 4, lines: 28 },
      ],
    },
    aiFixSnippet: {
      title: "Offload Room DB Roster Insertion to Dispatchers.IO to Fix ANR",
      file: "com/shulebase/app/ui/attendance/AttendanceViewModel.kt",
      diffBefore: `fun persistRoster(roster: List<Student>) {\n    // Blocking main thread!\n    studentDao.insertStudentsSync(roster)\n    _uiState.value = State.Ready\n}`,
      diffAfter: `fun persistRoster(roster: List<Student>) = viewModelScope.launch {\n    // Offloaded to I/O coroutine worker pool\n    withContext(Dispatchers.IO) {\n        studentDao.insertStudentsChunked(roster, chunkSize = 500)\n    }\n    _uiState.value = State.Ready\n}`,
      tests: [
        { name: "should_not_block_main_thread_on_large_roster", status: "pass" },
        { name: "should_persist_all_5000_students_in_chunks", status: "pass" },
        { name: "compose_recomposition_does_not_skip_frames", status: "pass" },
      ],
    },
  },
  {
    id: "entrymind-desktop",
    name: "EntryMind Desktop",
    category: "Desktop",
    platform: "Python / PyQt5 / SQLite",
    vitals: "OK",
    errorCount: 0,
    hasSpike: false,
    sastGrade: "A",
    healthScore: 99,
    description: "Desktop biometric attendance, RFID reader bridge, and offline student gate verification kiosk.",
    repoPath: "/home/danitech/Desktop/Projects/ShuleBase-PyQT5",
    lastDeployed: "3 days ago",
    metrics: {
      cpu: "12%",
      memory: "185 MB",
      p99Latency: "18ms",
      activeSessions: "2 Kiosks Online",
    },
    scopedLogs: [
      { id: 201, ts: "12:20:00.014", level: "INFO", tag: "RFID.Bridge", msg: "USB HID RFID Scanner connected on /dev/ttyUSB0 (baud=9600)" },
      { id: 202, ts: "12:20:04.119", level: "INFO", tag: "GateController", msg: "Badge scan received: CARD_HEX=8A42FE01 -> Student ID: STU-4022" },
      { id: 203, ts: "12:20:04.142", level: "INFO", tag: "SQLite.WAL", msg: "WAL commit in 1.8ms: attendance_log id=99104 direction=IN" },
      { id: 204, ts: "12:20:04.150", level: "INFO", tag: "UI.Kiosk", msg: "Green LED pulse triggered (GPIO 18 high for 500ms)" },
      { id: 205, ts: "12:20:10.001", level: "INFO", tag: "Sync.Daemon", msg: "Remote cloud sync: 0 pending entries, queue clean" },
    ],
    scopedCrashes: [],
    scopedSast: [
      {
        id: "SAST-ENT-01",
        rule: "Plaintext Local SQLite Database File",
        severity: "low",
        file: "core/database.py",
        line: 19,
        description: "Local attendance SQLite cache is stored unencrypted on disk.",
        remediationSnippet: "Integrate SQLCipher via pysqlcipher3 for transparent AES-256 file encryption.",
      },
    ],
    astHighlight: {
      rootClass: "KioskMainWindow",
      loc: 520,
      methods: [
        { name: "handle_badge_event()", complexity: 5, lines: 42 },
        { name: "validate_student_enrollment()", complexity: 7, lines: 38 },
        { name: "pulse_gpio_relay()", complexity: 3, lines: 21 },
      ],
    },
    aiFixSnippet: {
      title: "Isolate USB Serial Loop in Dedicated QThread",
      file: "hardware/rfid_listener.py",
      diffBefore: `class ScannerThread(threading.Thread):\n    def run(self):\n        while self.running:\n            data = self.serial.readline()\n            self.parent.ui.update_display(data)`,
      diffAfter: `class ScannerWorker(QObject):\n    scanReceived = pyqtSignal(str)\n    def run(self):\n        while self.running:\n            data = self.serial.readline()\n            self.scanReceived.emit(data.strip())`,
      tests: [
        { name: "test_qthread_signals_dispatched_without_lag", status: "pass" },
        { name: "test_serial_port_clean_release_on_exit", status: "pass" },
      ],
    },
  },
  {
    id: "shulebase-web",
    name: "ShuleBase Web Portal",
    category: "Web API",
    platform: "TypeScript / React 19 / Next.js",
    vitals: "OK",
    errorCount: 4,
    hasSpike: false,
    sastGrade: "A-",
    healthScore: 96,
    description: "Administrative web dashboard for school principals, fee tracking, and report cards.",
    repoPath: "/home/danitech/Desktop/Projects/shulebase-react",
    lastDeployed: "Yesterday 14:15",
    metrics: {
      cpu: "22%",
      memory: "680 MB",
      p99Latency: "65ms",
      activeSessions: "8,900 visitors",
    },
    scopedLogs: [
      { id: 301, ts: "12:22:10.119", level: "INFO", tag: "NextServer", msg: "GET /grades/export/pdf status=200 120ms" },
      { id: 302, ts: "12:22:14.502", level: "INFO", tag: "SSR.Renderer", msg: "Rendered page /dashboard/financials in 38ms" },
      { id: 303, ts: "12:22:18.910", level: "WARN", tag: "Auth.Session", msg: "Session token renewed for principal:admin@shulebase.ac.tz" },
      { id: 304, ts: "12:22:25.044", level: "INFO", tag: "CDN.Cache", msg: "Static asset /bundle.js cache hit (edge-iad1)" },
    ],
    scopedCrashes: [],
    scopedSast: [
      {
        id: "SAST-WEB-01",
        rule: "Missing Strict-Transport-Security Header",
        severity: "medium",
        file: "next.config.ts",
        line: 12,
        description: "HSTS header max-age not enforced on production domain.",
        remediationSnippet: "Add Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
      },
    ],
    astHighlight: {
      rootClass: "FinancialsReportView",
      loc: 410,
      methods: [
        { name: "calculateTermTuition()", complexity: 8, lines: 52 },
        { name: "generatePdfExport()", complexity: 11, lines: 68 },
      ],
    },
    aiFixSnippet: {
      title: "Add Security Headers in Next.js Configuration",
      file: "next.config.ts",
      diffBefore: `export default {\n  reactStrictMode: true,\n};`,
      diffAfter: `export default {\n  reactStrictMode: true,\n  async headers() {\n    return [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }];\n  }\n};`,
      tests: [
        { name: "test_headers_present_in_responses", status: "pass" },
      ],
    },
  },
];

export function getSoftwareById(id: string): SoftwareProject | undefined {
  return INITIAL_SOFTWARE_FLEET.find((p) => p.id === id);
}

/**
 * ⚡ NEXIS // CORE NODE TAXONOMY & ARCHITECTURAL MAPPING
 * Generates the 5 foundational node archetypes scoped specifically to the selected Target:
 *  1. INGRESS / GATEWAY    --> [ Edge Routers, Reverse Proxies, UI Event Dispatchers ]
 *  2. COMPUTE / EXECUTION  --> [ API Handlers, Async Task Workers, Render Engines, UI Main Threads ]
 *  3. PERSISTENT STORAGE   --> [ SQL/NoSQL Engines, Key-Value Caches, Local Mobile SQLite / Room ]
 *  4. EXTERNAL INTEGRATION --> [ Payment Gateways, OAuth Providers, CDN Edges, Third-Party SDKs ]
 *  5. ASYNC & BACKGROUND   --> [ Message Queues, Dead Letter Queues (DLQ), Cron Daemons ]
 */
export function getMonitoredSystemsForProject(project: SoftwareProject): import("./systems").MonitoredSystem[] {
  if (project.id === "shulebase-android") {
    return [
      {
        id: "shu-ingress",
        name: "Retrofit / DeepLink Router",
        tag: "INGRESS",
        category: "ingress",
        nodeType: "INGRESS_NODE",
        env: "production",
        host: "client.shulebase.internal",
        port: 443,
        region: "Android Intent Bus",
        status: "online",
        healthScore: 97,
        logRate: "88 req/s",
        uptime: "99.98%",
        version: "OkHttp 4.12 / Retrofit 2.11",
        description: "Sensory Cortex & Mouth: Network interceptor pipeline, deep link activity router, and SSL pinning verifier.",
        sampleLogs: {
          info: [
            "[OkHttp] --> GET /api/v1/students/attendance?grade=10 http/1.1",
            "[DeepLinkRouter] Dispatched intent: shulebase://attendance/scan to ScanActivity",
            "[OkHttp] <-- 200 OK https://api.shulebase.ac.tz/api/v1/students (142ms, 4.2KB)",
            "[AuthInterceptor] Attached Bearer JWT token to outbound egress packet",
          ],
          warn: [
            "[OkHttp] HTTP 429 Too Many Requests received from remote rate-limiter, backing off 2000ms",
            "[NetworkSecurity] Cleartext HTTP permitted in manifest fallback debug builds",
          ],
          error: [
            "[OkHttp] java.net.SocketTimeoutException: failed to connect to api.shulebase.ac.tz after 10000ms",
          ],
          debug: [
            "[SSLHandshake] TLS_AES_128_GCM_SHA256 connection established with edge CDN",
          ],
          trace: [
            "[IntentDispatcher] Handling action: android.intent.action.VIEW",
          ],
        },
        analysis: {
          avgLatency: "65ms",
          p99Latency: "180ms",
          throughput: "88 req/s",
          errorRate: "0.2%",
          memoryUsage: "48 MB / 128 MB",
          cpuUsage: "12%",
          insights: [
            "Retrofit connection pool recycling active; zero socket leak detected.",
            "Ingress deep links routing with sub-5ms latency across all Activity targets.",
          ],
        },
        debugging: {
          activeThreads: 4,
          openSockets: 6,
          heapAllocated: "32 MB",
          gcPauseAvg: "0.8ms",
          recentStackTraces: [],
          probes: [
            { name: "OkHttp Client Pool", status: "passing", latency: "1.2ms" },
            { name: "Deep Link Registry", status: "passing", latency: "0.4ms" },
            { name: "TLS Pinning Verifier", status: "passing", latency: "4.8ms" },
          ],
        },
        recommendations: [
          {
            id: "REC-SHU-ING-01",
            title: "Enforce HTTP/3 QUIC on Retrofit Client",
            severity: "low",
            category: "Performance",
            impact: "Reduces mobile handshake latency on cellular networks by 30%.",
            suggestedFix: "Configure CronetEngine Provider in OkHttpClient.Builder().",
            autoFixable: true,
          },
        ],
        issues: [],
      },
      {
        id: "shu-compute",
        name: "Jetpack Compose / UI Thread",
        tag: "COMPUTE",
        category: "compute",
        nodeType: "COMPUTE_NODE",
        env: "production",
        host: "android.runtime.dalvik",
        port: 14890,
        region: "Main UI Thread (tid=1)",
        status: "warn",
        healthScore: 68,
        logRate: "340 lps",
        uptime: "98.20%",
        version: "Compose 1.6 / Kotlin 2.0",
        description: "Muscular & Skeletal: Primary render engine, recomposition loop, and user event state coordinators.",
        sampleLogs: {
          info: [
            "[Compose] Recomposition loop finished for AttendanceScreen in 14ms",
            "[ViewModel] StateFlow updated: AttendanceUiState.Success(records=420)",
            "[Choreographer] Frame rendered on hardware vsync boundary (16.6ms)",
          ],
          warn: [
            "[Choreographer] Skipped 48 frames! The application may be doing too much work on its main thread.",
            "[Compose] Unstable parameter in StudentRowItem causing unnecessary recomposition",
          ],
          error: [
            "[ActivityManager] ANR in com.shulebase.app (com.shulebase.app/.ui.AttendanceActivity)",
            "[ProcessCpuTracker] CPU usage: 98% TOTAL: 62% user + 36% kernel / com.shulebase.app: 84%",
            "[AndroidRuntime] FATAL EXCEPTION: main Process: com.shulebase.app, PID: 14890",
          ],
          debug: [
            "[LayoutInspector] Recomposition counts: StudentCard (x1), HeaderBar (x1)",
          ],
          trace: [
            "[Trace] Choreographer#doFrame 16666us",
          ],
        },
        analysis: {
          avgLatency: "480ms",
          p99Latency: "5,400ms",
          throughput: "1,240 DAU",
          errorRate: "4.8%",
          memoryUsage: "380 MB / 512 MB",
          cpuUsage: "84%",
          insights: [
            "CRITICAL: Main thread blocked for >5000ms triggering OS ANR dialogues.",
            "Compose recomposition frame drops directly correlate with synchronous disk inserts.",
          ],
        },
        debugging: {
          activeThreads: 18,
          openSockets: 8,
          heapAllocated: "340 MB",
          gcPauseAvg: "14.2ms",
          recentStackTraces: [
            {
              id: "CRASH-SHU-01",
              timestamp: "12:18:04",
              error: "ANR: Main thread blocked during Room DB bulk insert",
              location: "StudentDao_Impl.java:240",
              stack: [
                "  at android.database.sqlite.SQLiteConnection.nativeExecute(Native Method)",
                "  at com.shulebase.app.data.db.StudentDao_Impl.insertStudentsSync(StudentDao_Impl.java:240)",
                "  at com.shulebase.app.ui.attendance.AttendanceViewModel.persistRoster(AttendanceViewModel.kt:89)",
              ],
            },
          ],
          probes: [
            { name: "Choreographer Frame Clock", status: "degraded", latency: "68ms" },
            { name: "UI Main Looper", status: "failing", latency: "5400ms" },
            { name: "RenderThread Hardware Sync", status: "passing", latency: "14ms" },
          ],
        },
        recommendations: [
          {
            id: "REC-SHU-CMP-01",
            title: "Offload Room DB Insertion to Dispatchers.IO",
            severity: "critical",
            category: "Performance",
            impact: "Completely eliminates 5.4s UI freeze and ANR popups.",
            suggestedFix: "Wrap studentDao.insertStudents in withContext(Dispatchers.IO).",
            autoFixable: true,
          },
        ],
        issues: [
          {
            id: "ISS-SHU-ANR-01",
            title: "Application Not Responding (ANR) on Attendance Sync",
            severity: "critical",
            time: "12:18:04",
            status: "open",
            description: "Main thread locked while inserting 4,000 student biometric records.",
          },
        ],
      },
      {
        id: "shu-storage",
        name: "Room Database / SQLite Cache",
        tag: "STORAGE",
        category: "storage",
        nodeType: "DATA_STORE_NODE",
        env: "production",
        host: "local.device.storage",
        port: 0,
        region: "/data/data/com.shulebase/databases",
        status: "warn",
        healthScore: 74,
        logRate: "190 lps",
        uptime: "99.90%",
        version: "Room 2.6 / SQLite 3.42",
        description: "Memory & Brain: Persistent student roster, offline biometric attendance cache, and SQLite WAL engine.",
        sampleLogs: {
          info: [
            "[RoomSQLite] WAL checkpoint completed in 4.2ms (log frames: 120)",
            "[RoomSQLite] SELECT * FROM students WHERE grade = '10-A' returned 42 rows (1.8ms)",
            "[RoomSQLite] Transaction committed: updated 1 student biometric hash",
          ],
          warn: [
            "[RoomSQLite] Disk I/O latency: writing 4,000 student records in single UI transaction (4,800ms)",
            "[RoomSQLite] Table 'attendance_logs' missing index on (student_id, date)",
          ],
          error: [
            "[RoomSQLite] android.database.sqlite.SQLiteDatabaseLockedException: database is locked (code 5)",
          ],
          debug: [
            "[SQLiteWAL] Pragma synchronous = NORMAL; journal_mode = WAL",
          ],
          trace: [
            "[SQLiteNative] B-tree search page=42 offset=1024",
          ],
        },
        analysis: {
          avgLatency: "48ms",
          p99Latency: "1,200ms",
          throughput: "240 ops/s",
          errorRate: "1.8%",
          memoryUsage: "64 MB / 128 MB",
          cpuUsage: "45%",
          insights: [
            "Write throughput choked by un-batched single-record insertions.",
            "WAL journal mode active and healthy; zero corruption incidents recorded.",
          ],
        },
        debugging: {
          activeThreads: 3,
          openSockets: 1,
          heapAllocated: "42 MB",
          gcPauseAvg: "1.8ms",
          recentStackTraces: [],
          probes: [
            { name: "SQLite WAL Engine", status: "passing", latency: "0.8ms" },
            { name: "Room Schema Validation", status: "passing", latency: "0.2ms" },
            { name: "Flash Storage Write Queue", status: "degraded", latency: "140ms" },
          ],
        },
        recommendations: [
          {
            id: "REC-SHU-STO-01",
            title: "Chunk Bulk Inserts and Add Composite Index",
            severity: "high",
            category: "Performance",
            impact: "Reduces disk write duration from 4.8s to 120ms.",
            suggestedFix: "Use @Insert(onConflict = OnConflictStrategy.REPLACE) with chunked transactions of 500 rows.",
            autoFixable: true,
          },
        ],
        issues: [],
      },
      {
        id: "shu-external",
        name: "Firebase Cloud Messaging & Cloud Auth",
        tag: "EXTERNAL",
        category: "external",
        nodeType: "EXTERNAL_INTEGRATION_NODE",
        env: "production",
        host: "fcm.googleapis.com",
        port: 443,
        region: "Global Cloud Ingress",
        status: "online",
        healthScore: 99,
        logRate: "42 lps",
        uptime: "99.99%",
        version: "FCM v23 / Google Play Services",
        description: "Vocal Cords & Limbs: Push notifications daemon, remote cloud tokens, and third-party SMS alerts.",
        sampleLogs: {
          info: [
            "[FCM] Push token registered: dX92kA_8819... TTL=30d",
            "[FCM] Downstream message received: notification_id=att_notice_499",
            "[CloudAuth] OAuth2 refresh token verified against accounts.google.com",
          ],
          warn: [
            "[FCM] Battery optimization warning: app placed in standby bucket 'rare'",
          ],
          error: [
            "[FCM] Downstream message dropped: payload exceeds 4KB max limit",
          ],
          debug: [
            "[FCM] Wakelock acquired for 800ms to process high-priority message",
          ],
          trace: [
            "[FCM] Socket TLS heartbeat ack",
          ],
        },
        analysis: {
          avgLatency: "110ms",
          p99Latency: "340ms",
          throughput: "24 msgs/min",
          errorRate: "0.01%",
          memoryUsage: "28 MB / 64 MB",
          cpuUsage: "4%",
          insights: [
            "FCM delivery rate reaches 99.4% within 3 seconds of notification dispatch.",
            "Zero auth token rejection cycles over past 7 days.",
          ],
        },
        debugging: {
          activeThreads: 2,
          openSockets: 2,
          heapAllocated: "18 MB",
          gcPauseAvg: "0.4ms",
          recentStackTraces: [],
          probes: [
            { name: "Google Play Services IPC", status: "passing", latency: "1.8ms" },
            { name: "FCM Keepalive Socket", status: "passing", latency: "24ms" },
          ],
        },
        recommendations: [
          {
            id: "REC-SHU-EXT-01",
            title: "Handle Notification Trampoline Restrictions",
            severity: "medium",
            category: "Reliability",
            impact: "Ensures notification clicks open directly on Android 12+ without warning.",
            suggestedFix: "Trigger PendingIntent directly without broadcast trampoline.",
            autoFixable: true,
          },
        ],
        issues: [],
      },
      {
        id: "shu-async",
        name: "WorkManager Sync Daemon",
        tag: "ASYNC",
        category: "async",
        nodeType: "BACKGROUND_QUEUE_NODE",
        env: "production",
        host: "android.job.scheduler",
        port: 0,
        region: "Background Worker Pool",
        status: "online",
        healthScore: 92,
        logRate: "75 lps",
        uptime: "99.95%",
        version: "WorkManager 2.9",
        description: "Circulatory & Immune: Decoupled background synchronization, SQLite offline dirty flag flush, and biometric upload queue.",
        sampleLogs: {
          info: [
            "[WorkManager] Scheduled PeriodicWorkRequest: AttendanceUploadWorker (interval=15m)",
            "[WorkManager] Constraints satisfied: NetworkType.CONNECTED, BatteryNotLow",
            "[SyncWorker] Uploaded 124 cached attendance records to remote server in 340ms",
          ],
          warn: [
            "[WorkManager] Worker execution throttled due to Android Doze mode",
          ],
          error: [
            "[SyncWorker] Server returned 503 Service Unavailable, escalating exponential backoff to 60s",
          ],
          debug: [
            "[WorkManager] WorkSpec id=4a92c-881 status=RUNNING tags=['sync', 'biometric']",
          ],
          trace: [
            "[JobScheduler] Job finished: id=14092 result=SUCCESS",
          ],
        },
        analysis: {
          avgLatency: "240ms",
          p99Latency: "820ms",
          throughput: "45 jobs/hr",
          errorRate: "0.4%",
          memoryUsage: "36 MB / 96 MB",
          cpuUsage: "16%",
          insights: [
            "Offline queue flushes cleanly within 40 seconds of Wi-Fi / LTE reconnection.",
            "Exponential backoff prevents server hammering during network hiccups.",
          ],
        },
        debugging: {
          activeThreads: 4,
          openSockets: 2,
          heapAllocated: "24 MB",
          gcPauseAvg: "0.9ms",
          recentStackTraces: [],
          probes: [
            { name: "JobScheduler Service", status: "passing", latency: "0.6ms" },
            { name: "Offline Sync Queue", status: "passing", latency: "1.4ms" },
          ],
        },
        recommendations: [
          {
            id: "REC-SHU-ASY-01",
            title: "Add Network Unmetered Constraint for Large Photo Syncs",
            severity: "low",
            category: "Cost",
            impact: "Prevents excessive mobile cellular data consumption for parents and staff.",
            suggestedFix: "Set Constraints.Builder().setRequiredNetworkType(NetworkType.UNMETERED).",
            autoFixable: true,
          },
        ],
        issues: [],
      },
    ];
  }

  if (project.id === "apex-logistics") {
    return [
      {
        id: "apx-ingress",
        name: "Nginx / Traefik Reverse Proxy",
        tag: "INGRESS",
        category: "ingress",
        nodeType: "INGRESS_NODE",
        env: "production",
        host: "gateway.apexlogistics.com",
        port: 443,
        region: "us-east-1 (Anycast)",
        status: "online",
        healthScore: 98,
        logRate: "1,420 req/s",
        uptime: "99.99%",
        version: "Nginx 1.25 / TLS 1.3",
        description: "Sensory Cortex & Mouth: Ingress rate-limiting, SSL termination, and Django URL request dispatching.",
        sampleLogs: {
          info: [
            "[Nginx] 192.168.1.102 - - [19/Oct/2026:12:15:02] 'GET /api/v2/shipments/SHP-8891 HTTP/2' 200 142ms",
            "[Nginx] Rate limit token bucket: 140 req/min available for tenant_442",
            "[SSL] TLSv1.3 / TLS_AES_256_GCM_SHA384 handshake completed in 1.4ms",
          ],
          warn: [
            "[Nginx] Client 192.168.4.12 approaching burst rate limit threshold (85%)",
          ],
          error: [
            "[Nginx] 502 Bad Gateway: upstream worker timeout on /api/v2/invoices/generate",
          ],
          debug: [
            "[Nginx] Upstream round-robin selected: 10.0.4.12:8000",
          ],
          trace: [
            "[Nginx] Epoll event dispatch: 120 sockets processed",
          ],
        },
        analysis: {
          avgLatency: "4.2ms",
          p99Latency: "18ms",
          throughput: "1,420 req/s",
          errorRate: "0.02%",
          memoryUsage: "240 MB / 1 GB",
          cpuUsage: "18%",
          insights: [
            "Reverse proxy TLS session resumption rate is 96.8%.",
            "Zero packet drops at edge network interface.",
          ],
        },
        debugging: {
          activeThreads: 8,
          openSockets: 1420,
          heapAllocated: "180 MB",
          gcPauseAvg: "0.1ms",
          recentStackTraces: [],
          probes: [
            { name: "TCP Handshake Engine", status: "passing", latency: "0.8ms" },
            { name: "Upstream Worker Health", status: "passing", latency: "2.1ms" },
          ],
        },
        recommendations: [],
        issues: [],
      },
      {
        id: "apx-compute",
        name: "Django WSGI / REST Handlers",
        tag: "COMPUTE",
        category: "compute",
        nodeType: "COMPUTE_NODE",
        env: "production",
        host: "10.0.4.12",
        port: 8000,
        region: "us-east-1a",
        status: "online",
        healthScore: 94,
        logRate: "420 lps",
        uptime: "99.95%",
        version: "Django 5.1 / Gunicorn 22.0",
        description: "Muscular & Skeletal: Core freight rate calculations, shipment tariff validation, and carrier routing.",
        sampleLogs: {
          info: [
            "[Django] GET /api/v2/shipments/SHP-8891 status=200 42ms",
            "[Django] Freight rate calculated for route NY-LON: $4,200.00",
            "[Django] User usr_8911 authenticated via JWT Bearer",
          ],
          warn: [
            "[Django] Uncached rate calculation required 14 SQL lookups",
          ],
          error: [
            "[Django] DatabaseOperationalError: Connection reset by peer during freight invoice export",
          ],
          debug: [
            "[Django] Queryset evaluation: CarrierRoute.objects.filter(is_active=True)",
          ],
          trace: [
            "[Django] Middleware dispatch: SecurityMiddleware, SessionMiddleware",
          ],
        },
        analysis: {
          avgLatency: "38ms",
          p99Latency: "112ms",
          throughput: "3,400 req/min",
          errorRate: "0.14%",
          memoryUsage: "1.2 GB / 4 GB",
          cpuUsage: "34%",
          insights: [
            "Throughput nominal across REST endpoints.",
            "Tariff calculator AST optimized for parallel vectorized operations.",
          ],
        },
        debugging: {
          activeThreads: 16,
          openSockets: 120,
          heapAllocated: "1.1 GB",
          gcPauseAvg: "1.2ms",
          recentStackTraces: [
            {
              id: "CRASH-APX-01",
              timestamp: "12:14:22",
              error: "DatabaseOperationalError: Connection reset by peer",
              location: "logistics/tasks/invoicing.py:84",
              stack: [
                "  File 'logistics/tasks/invoicing.py', line 84, in generate_pdf_manifest",
                "    cursor.execute('SELECT * FROM freight_records WHERE batch_id = %s', [batch_id])",
                "django.db.utils.OperationalError: server closed the connection unexpectedly",
              ],
            },
          ],
          probes: [
            { name: "Gunicorn Worker Pool", status: "passing", latency: "1.4ms" },
            { name: "PostgreSQL Connection Check", status: "passing", latency: "3.2ms" },
          ],
        },
        recommendations: [
          {
            id: "REC-APX-CMP-01",
            title: "Replace Raw SQL with Django ORM QuerySet",
            severity: "critical",
            category: "Security",
            impact: "Prevents SQL injection vulnerabilities in carrier query filter.",
            suggestedFix: "CarrierRoute.objects.filter(carrier_id=carrier_param, is_active=True)",
            autoFixable: true,
          },
        ],
        issues: [],
      },
      {
        id: "apx-storage",
        name: "PostgreSQL Freight Cluster",
        tag: "STORAGE",
        category: "storage",
        nodeType: "DATA_STORE_NODE",
        env: "production",
        host: "10.0.8.4",
        port: 5432,
        region: "us-east-1a",
        status: "warn",
        healthScore: 82,
        logRate: "310 lps",
        uptime: "99.92%",
        version: "PostgreSQL 16.2 / PgBouncer",
        description: "Memory & Brain: ACID shipments ledger, route tariff matrices, carrier ratings, and bill-of-lading archives.",
        sampleLogs: {
          info: [
            "[Postgres] Commit transaction tx_88412 in 2.4ms",
            "[Postgres] Index scan on carrier_routes_pkey (hit ratio 99.4%)",
          ],
          warn: [
            "[Postgres] Slow query detected (420ms): SELECT * FROM carrier_routes WHERE origin_zone = 'EU-WEST'",
            "[PgBouncer] Active server connections: 48/50 allocated",
          ],
          error: [
            "[Postgres] canceling statement due to statement timeout (5000ms)",
          ],
          debug: [
            "[Postgres] Vacuum analyze on table 'carrier_routes' completed",
          ],
          trace: [
            "[Postgres] WAL segment 00000001000000020000005C flushed",
          ],
        },
        analysis: {
          avgLatency: "6.8ms",
          p99Latency: "420ms",
          throughput: "4,800 qps",
          errorRate: "0.8%",
          memoryUsage: "3.4 GB / 8 GB",
          cpuUsage: "64%",
          insights: [
            "Unindexed query on 'origin_zone' causes periodic 420ms latency spikes.",
            "PgBouncer pool near capacity during batch reconciliation runs.",
          ],
        },
        debugging: {
          activeThreads: 32,
          openSockets: 240,
          heapAllocated: "2.8 GB",
          gcPauseAvg: "0.4ms",
          recentStackTraces: [],
          probes: [
            { name: "Primary Master Node", status: "passing", latency: "0.8ms" },
            { name: "PgBouncer Pool Reserve", status: "degraded", latency: "18ms" },
          ],
        },
        recommendations: [
          {
            id: "REC-APX-STO-01",
            title: "Add Composite Index on carrier_routes(origin_zone, carrier_code)",
            severity: "high",
            category: "Performance",
            impact: "Reduces slow query lookup time from 420ms to 4ms.",
            suggestedFix: "CREATE INDEX CONCURRENTLY idx_carrier_routes_zone ON carrier_routes(origin_zone, carrier_code);",
            autoFixable: true,
          },
        ],
        issues: [],
      },
      {
        id: "apx-external",
        name: "Stripe & M-Pesa Payment Edge",
        tag: "EXTERNAL",
        category: "external",
        nodeType: "EXTERNAL_INTEGRATION_NODE",
        env: "production",
        host: "api.stripe.com",
        port: 443,
        region: "Global Payment Perimeter",
        status: "warn",
        healthScore: 78,
        logRate: "65 lps",
        uptime: "99.85%",
        version: "Stripe SDK 9.4 / Daraja API v2",
        description: "Vocal Cords & Limbs: Invoicing settlement webhooks, card charge processing, and mobile money carrier payouts.",
        sampleLogs: {
          info: [
            "[Payment] Charge created: ch_3Nx1489 amount=$4,990.00 currency=usd status=succeeded",
            "[Payment] Daraja M-Pesa STK push completed: CheckoutRequestID=ws_CO_191026",
          ],
          warn: [
            "[Payment] Stripe API webhook retry attempt 2/3 for invoice INV-9041",
            "[Payment] Egress handshake took 1,480ms to external banking settlement partner",
          ],
          error: [
            "[Payment] Stripe API webhook timeout on invoice INV-9041 retry=2",
          ],
          debug: [
            "[Payment] Signature verification: t=1729334112,v1=9f8c...",
          ],
          trace: [
            "[Payment] POST /v1/charges request payload encrypted",
          ],
        },
        analysis: {
          avgLatency: "280ms",
          p99Latency: "1,840ms",
          throughput: "340 tx/min",
          errorRate: "1.2%",
          memoryUsage: "84 MB / 256 MB",
          cpuUsage: "14%",
          insights: [
            "External payment timeouts isolated to upstream banking partner; internal DB unaffected.",
          ],
        },
        debugging: {
          activeThreads: 6,
          openSockets: 14,
          heapAllocated: "68 MB",
          gcPauseAvg: "0.6ms",
          recentStackTraces: [],
          probes: [
            { name: "Stripe API Egress", status: "degraded", latency: "1480ms" },
            { name: "M-Pesa Daraja Gateway", status: "passing", latency: "120ms" },
          ],
        },
        recommendations: [
          {
            id: "REC-APX-EXT-01",
            title: "Enable Circuit Breaker on Third-Party Payment Webhooks",
            severity: "high",
            category: "Reliability",
            impact: "Prevents blocking Django worker threads when payment gateway is degraded.",
            suggestedFix: "Implement pybreaker with failure_threshold=5, recovery_timeout=60.",
            autoFixable: true,
          },
        ],
        issues: [
          {
            id: "ISS-APX-PAY-01",
            title: "Intermittent Stripe Webhook Timeout",
            severity: "medium",
            time: "12:15:14",
            status: "open",
            description: "Upstream webhook acknowledgement timeout on large freight settlement batch.",
          },
        ],
      },
      {
        id: "apx-async",
        name: "Celery Workers & Redis Queue",
        tag: "ASYNC",
        category: "async",
        nodeType: "BACKGROUND_QUEUE_NODE",
        env: "production",
        host: "10.0.6.15",
        port: 6379,
        region: "us-east-1a",
        status: "online",
        healthScore: 96,
        logRate: "280 lps",
        uptime: "99.98%",
        version: "Celery 5.4 / Redis 7.2",
        description: "Circulatory & Immune: PDF manifest generation, automated freight reconciliation cron, and email notification dispatcher.",
        sampleLogs: {
          info: [
            "[Celery] Task logistics.tasks.reconcile_freight_invoices[f31a] completed in 420ms",
            "[Celery] Task logistics.tasks.send_shipment_tracking_sms[a891] succeeded",
            "[RedisQueue] Queue 'freight_priority' depth: 0 pending tasks",
          ],
          warn: [
            "[Celery] PDF manifest worker took 2,800ms for large 400-page batch",
          ],
          error: [
            "[Celery] Task logistics.tasks.generate_pdf_manifest[c421] failed: connection closed",
          ],
          debug: [
            "[RedisQueue] Memory allocated: 412 MB, peak: 440 MB",
          ],
          trace: [
            "[Celery] Heartbeat sent from worker-node-03",
          ],
        },
        analysis: {
          avgLatency: "140ms",
          p99Latency: "480ms",
          throughput: "2,400 jobs/min",
          errorRate: "0.08%",
          memoryUsage: "480 MB / 2 GB",
          cpuUsage: "28%",
          insights: [
            "Queue lag is sub-100ms across priority and standard Celery queues.",
            "Dead Letter Queue (DLQ) clean: 0 poison pills detected.",
          ],
        },
        debugging: {
          activeThreads: 12,
          openSockets: 48,
          heapAllocated: "420 MB",
          gcPauseAvg: "0.8ms",
          recentStackTraces: [],
          probes: [
            { name: "Redis Broker Heartbeat", status: "passing", latency: "0.4ms" },
            { name: "Celery Worker Ping", status: "passing", latency: "1.2ms" },
          ],
        },
        recommendations: [],
        issues: [],
      },
    ];
  }

  if (project.id === "entrymind-desktop") {
    return [
      {
        id: "ent-ingress",
        name: "UI Action & RFID Reader Bus",
        tag: "INGRESS",
        category: "ingress",
        nodeType: "INGRESS_NODE",
        env: "production",
        host: "/dev/ttyUSB0",
        port: 9600,
        region: "Local Hardware Bus",
        status: "online",
        healthScore: 99,
        logRate: "35 lps",
        uptime: "99.99%",
        version: "PySerial 3.5 / HID Bridge",
        description: "Sensory Cortex & Mouth: USB RFID badge scanner serial bridge, touch screen event dispatcher, and barcode parser.",
        sampleLogs: {
          info: [
            "[RFID.Bridge] USB HID RFID Scanner connected on /dev/ttyUSB0 (baud=9600)",
            "[GateController] Badge scan received: CARD_HEX=8A42FE01 -> Student ID: STU-4022",
            "[UI.Kiosk] Touchscreen tap on 'Scan Attendance' button",
          ],
          warn: [
            "[RFID.Bridge] Unrecognized RFID card frequency header 0x7F",
          ],
          error: [],
          debug: [
            "[PySerial] Buffer flush: 16 bytes read in 0.2ms",
          ],
          trace: [
            "[HID] Scancode 0x1E (KEY_1) processed",
          ],
        },
        analysis: {
          avgLatency: "1.2ms",
          p99Latency: "8.4ms",
          throughput: "42 scans/min",
          errorRate: "0.0%",
          memoryUsage: "24 MB / 128 MB",
          cpuUsage: "2%",
          insights: [
            "Hardware USB serial latency remains sub-2ms on all badge scans.",
          ],
        },
        debugging: {
          activeThreads: 2,
          openSockets: 1,
          heapAllocated: "18 MB",
          gcPauseAvg: "0.2ms",
          recentStackTraces: [],
          probes: [
            { name: "USB Serial Bridge", status: "passing", latency: "0.4ms" },
            { name: "Touchscreen Event Bus", status: "passing", latency: "0.8ms" },
          ],
        },
        recommendations: [],
        issues: [],
      },
      {
        id: "ent-compute",
        name: "PyQt6 UI Event Loop & Engine",
        tag: "COMPUTE",
        category: "compute",
        nodeType: "COMPUTE_NODE",
        env: "production",
        host: "127.0.0.1",
        port: 8088,
        region: "Kiosk Native UI Process",
        status: "online",
        healthScore: 99,
        logRate: "120 lps",
        uptime: "99.99%",
        version: "Python 3.12 / PyQt6 6.7",
        description: "Muscular & Skeletal: Kiosk desktop window, student verification rules, GPIO relay gate trigger, and local facial matching.",
        sampleLogs: {
          info: [
            "[UI.Kiosk] Student verified: STU-4022 (John Doe - Grade 11-B)",
            "[UI.Kiosk] Green LED pulse triggered (GPIO 18 high for 500ms)",
            "[UI.Kiosk] Gate barrier servo unlocked: 2500ms pulse",
          ],
          warn: [],
          error: [],
          debug: [
            "[QTimer] Keepalive tick 1000ms nominal",
          ],
          trace: [
            "[QPainter] Repaint widget KioskMainWindow in 2.1ms",
          ],
        },
        analysis: {
          avgLatency: "18ms",
          p99Latency: "34ms",
          throughput: "2 Kiosks Online",
          errorRate: "0.0%",
          memoryUsage: "185 MB / 512 MB",
          cpuUsage: "12%",
          insights: [
            "UI responsiveness nominal; 60 FPS maintained without frame drops.",
          ],
        },
        debugging: {
          activeThreads: 4,
          openSockets: 2,
          heapAllocated: "160 MB",
          gcPauseAvg: "0.4ms",
          recentStackTraces: [],
          probes: [
            { name: "PyQt Event Loop", status: "passing", latency: "0.6ms" },
            { name: "GPIO Gate Relay", status: "passing", latency: "1.1ms" },
          ],
        },
        recommendations: [],
        issues: [],
      },
      {
        id: "ent-storage",
        name: "Local SQLite Encrypted Vault",
        tag: "STORAGE",
        category: "storage",
        nodeType: "DATA_STORE_NODE",
        env: "production",
        host: "local.kiosk.disk",
        port: 0,
        region: "/var/lib/entrymind/kiosk.db",
        status: "online",
        healthScore: 99,
        logRate: "50 lps",
        uptime: "99.99%",
        version: "SQLite 3.44 / SQLCipher",
        description: "Memory & Brain: Zero-latency offline student roster cache, RFID hash lookup table, and local attendance journal.",
        sampleLogs: {
          info: [
            "[SQLite.WAL] WAL commit in 1.8ms: attendance_log id=99104 direction=IN",
            "[SQLite] Indexed scan on rfid_hashes took 0.4ms",
          ],
          warn: [],
          error: [],
          debug: [
            "[SQLite] Pragmas: journal_mode=WAL, synchronous=NORMAL, cache_size=-64000",
          ],
          trace: [
            "[SQLite] SELECT * FROM students WHERE badge_id = '8A42FE01' LIMIT 1",
          ],
        },
        analysis: {
          avgLatency: "1.4ms",
          p99Latency: "4.8ms",
          throughput: "800 tx/sec",
          errorRate: "0.0%",
          memoryUsage: "32 MB / 128 MB",
          cpuUsage: "3%",
          insights: [
            "Database reads execute in under 1 millisecond.",
            "Local offline storage verified for up to 500,000 offline scans.",
          ],
        },
        debugging: {
          activeThreads: 2,
          openSockets: 1,
          heapAllocated: "28 MB",
          gcPauseAvg: "0.2ms",
          recentStackTraces: [],
          probes: [
            { name: "SQLCipher Engine", status: "passing", latency: "0.3ms" },
            { name: "WAL Disk Persistence", status: "passing", latency: "0.9ms" },
          ],
        },
        recommendations: [],
        issues: [],
      },
      {
        id: "ent-external",
        name: "Remote Ollama & School Cloud API",
        tag: "EXTERNAL",
        category: "external",
        nodeType: "EXTERNAL_INTEGRATION_NODE",
        env: "production",
        host: "api.shulebase.ac.tz",
        port: 443,
        region: "Cloud Sync Gateway",
        status: "online",
        healthScore: 96,
        logRate: "18 lps",
        uptime: "99.95%",
        version: "REST / HTTPS v1.4",
        description: "Vocal Cords & Limbs: Central roster cloud synchronization, principal notification alerts, and remote device telemetry heartbeat.",
        sampleLogs: {
          info: [
            "[Sync.Daemon] Remote cloud sync: 0 pending entries, queue clean",
            "[Sync.Daemon] Pulled 2 newly enrolled student profiles from cloud",
          ],
          warn: [],
          error: [],
          debug: [
            "[HTTP] Heartbeat POST /kiosk/heartbeat status=200 in 84ms",
          ],
          trace: [
            "[TLS] Session ticket validated",
          ],
        },
        analysis: {
          avgLatency: "68ms",
          p99Latency: "180ms",
          throughput: "12 syncs/hr",
          errorRate: "0.0%",
          memoryUsage: "22 MB / 64 MB",
          cpuUsage: "4%",
          insights: [
            "Kiosk maintains 100% functionality during complete internet outages.",
          ],
        },
        debugging: {
          activeThreads: 2,
          openSockets: 2,
          heapAllocated: "16 MB",
          gcPauseAvg: "0.3ms",
          recentStackTraces: [],
          probes: [
            { name: "Cloud Sync Link", status: "passing", latency: "68ms" },
          ],
        },
        recommendations: [],
        issues: [],
      },
      {
        id: "ent-async",
        name: "Filesystem Watcher & Sync Thread",
        tag: "ASYNC",
        category: "async",
        nodeType: "BACKGROUND_QUEUE_NODE",
        env: "production",
        host: "local.kiosk.worker",
        port: 0,
        region: "Background QThread",
        status: "online",
        healthScore: 99,
        logRate: "22 lps",
        uptime: "99.99%",
        version: "QThread Worker Pool",
        description: "Circulatory & Immune: Offline attendance batch queue, backup log rotater, and local biometric image validator.",
        sampleLogs: {
          info: [
            "[Worker] QThread rfid_listener running on dedicated core",
            "[Worker] Daily database backup archive created: /var/backups/kiosk_20261019.bak",
          ],
          warn: [],
          error: [],
          debug: [
            "[Worker] Free disk space: 42.8 GB available (91%)",
          ],
          trace: [
            "[Worker] Sleep interval tick 5000ms",
          ],
        },
        analysis: {
          avgLatency: "0.8ms",
          p99Latency: "3.2ms",
          throughput: "60 cycles/min",
          errorRate: "0.0%",
          memoryUsage: "18 MB / 64 MB",
          cpuUsage: "1%",
          insights: [
            "Serial bridge listener isolated cleanly in background QThread.",
          ],
        },
        debugging: {
          activeThreads: 2,
          openSockets: 1,
          heapAllocated: "14 MB",
          gcPauseAvg: "0.1ms",
          recentStackTraces: [],
          probes: [
            { name: "QThread Event Queue", status: "passing", latency: "0.2ms" },
          ],
        },
        recommendations: [],
        issues: [],
      },
    ];
  }

  // Generic fallback: Generate 5 Core Archetype nodes dynamically for any enrolled project
  return [
    {
      id: `${project.id}-ingress`,
      name: `${project.name} Ingress / Router`,
      tag: "INGRESS",
      category: "ingress",
      nodeType: "INGRESS_NODE",
      env: "production",
      host: "ingress.nexis.internal",
      port: 443,
      region: "Edge Sensory Cortex",
      status: "online",
      healthScore: 98,
      logRate: "110 req/s",
      uptime: "99.98%",
      version: project.platform,
      description: `Ingress / Gateway node for ${project.name}: Receives external stimuli, user interactions, and dispatches them inward.`,
      sampleLogs: {
        info: [
          `[${project.name}] Inbound request packet routed to primary handler`,
          `[${project.name}] TLS handshake verified clean`,
        ],
        warn: [],
        error: [],
        debug: [
          `[${project.name}] Session token parsed from Authorization header`,
        ],
        trace: [
          `[${project.name}] Socket stream dispatched`,
        ],
      },
      analysis: {
        avgLatency: "8.4ms",
        p99Latency: "24ms",
        throughput: project.metrics.activeSessions,
        errorRate: "0.01%",
        memoryUsage: "64 MB / 256 MB",
        cpuUsage: "8%",
        insights: [
          `Front-door ingress pipeline operating nominally for ${project.name}.`,
        ],
      },
      debugging: {
        activeThreads: 4,
        openSockets: 48,
        heapAllocated: "48 MB",
        gcPauseAvg: "0.4ms",
        recentStackTraces: [],
        probes: [
          { name: "Edge Listener", status: "passing", latency: "0.8ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
    {
      id: `${project.id}-compute`,
      name: `${project.name} Compute Engine`,
      tag: "COMPUTE",
      category: "compute",
      nodeType: "COMPUTE_NODE",
      env: "production",
      host: "compute.nexis.internal",
      port: 8000,
      region: "Core Runtime",
      status: project.vitals === "OK" ? "online" : project.vitals === "Degraded" ? "warn" : "error",
      healthScore: project.healthScore,
      logRate: `${project.errorCount > 20 ? "380" : "140"} lps`,
      uptime: project.vitals === "OK" ? "99.98%" : "98.40%",
      version: project.platform,
      description: `Compute & Execution node for ${project.name}: Core business logic, AST-evaluated algorithms, and transformation workers.`,
      sampleLogs: {
        info: [
          `[${project.name}] Runtime execution nominal on ${project.platform}`,
          `[${project.name}] Processed AST evaluation for root class ${project.astHighlight.rootClass}`,
        ],
        warn: project.errorCount > 0 ? [
          `[${project.name}] Elevated latency observed in core computational thread`,
        ] : [],
        error: project.errorCount > 0 ? [
          `[${project.name}] Unhandled exception in ${project.scopedCrashes[0]?.location || "runtime loop"}`,
        ] : [],
        debug: [
          `[${project.name}] Memory buffer allocated: ${project.metrics.memory}`,
        ],
        trace: [
          `[${project.name}] Instruction cycle tick`,
        ],
      },
      analysis: {
        avgLatency: project.metrics.p99Latency,
        p99Latency: project.metrics.p99Latency,
        throughput: project.metrics.activeSessions,
        errorRate: `${((project.errorCount / (project.errorCount + 400)) * 100).toFixed(2)}%`,
        memoryUsage: `${project.metrics.memory} / allocated`,
        cpuUsage: project.metrics.cpu,
        insights: [
          `Platform: ${project.platform}.`,
          `SAST security evaluation grade: ${project.sastGrade}.`,
        ],
      },
      debugging: {
        activeThreads: 16,
        openSockets: 32,
        heapAllocated: project.metrics.memory,
        gcPauseAvg: "2.4ms",
        recentStackTraces: project.scopedCrashes.map((c) => ({
          id: c.id,
          timestamp: c.lastSeen,
          error: c.title,
          location: c.location,
          stack: c.stackTrace,
        })),
        probes: [
          { name: "Execution Runtime", status: project.vitals === "OK" ? "passing" : "degraded", latency: "2ms" },
        ],
      },
      recommendations: project.scopedSast.map((s, idx) => ({
        id: `REC-${project.id.toUpperCase()}-${idx + 1}`,
        title: `Fix ${s.rule}`,
        severity: s.severity,
        category: "Security",
        impact: s.description,
        suggestedFix: s.remediationSnippet,
        autoFixable: true,
      })),
      issues: project.scopedCrashes.map((c) => ({
        id: c.id,
        title: c.title,
        severity: c.severity,
        time: c.lastSeen,
        status: "open",
        description: `Crash in ${c.location} (${c.count} occurrences)`,
      })),
    },
    {
      id: `${project.id}-storage`,
      name: `${project.name} Persistent Storage`,
      tag: "STORAGE",
      category: "storage",
      nodeType: "DATA_STORE_NODE",
      env: "production",
      host: "storage.nexis.internal",
      port: 5432,
      region: "Persistent Layer",
      status: "online",
      healthScore: 95,
      logRate: "85 lps",
      uptime: "99.98%",
      version: "SQL / KV Engine",
      description: `Persistent Storage node for ${project.name}: Preserves state, entity records, and transactional integrity.`,
      sampleLogs: {
        info: [
          `[${project.name}] Transaction committed successfully in 2.1ms`,
          `[${project.name}] Query cache hit ratio: 98.4%`,
        ],
        warn: [],
        error: [],
        debug: [
          `[${project.name}] WAL frame written to disk`,
        ],
        trace: [
          `[${project.name}] Read lock released`,
        ],
      },
      analysis: {
        avgLatency: "2.4ms",
        p99Latency: "14ms",
        throughput: "1,200 qps",
        errorRate: "0.01%",
        memoryUsage: "320 MB / 1 GB",
        cpuUsage: "12%",
        insights: [
          "Storage pool latency remains healthy.",
        ],
      },
      debugging: {
        activeThreads: 8,
        openSockets: 24,
        heapAllocated: "280 MB",
        gcPauseAvg: "0.6ms",
        recentStackTraces: [],
        probes: [
          { name: "Storage Engine", status: "passing", latency: "0.6ms" },
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
      host: "external.perimeter.nexis",
      port: 443,
      region: "Egress Boundary",
      status: "online",
      healthScore: 96,
      logRate: "45 lps",
      uptime: "99.96%",
      version: "Third-Party Connectors",
      description: `External & Edge Integrations for ${project.name}: Third-party APIs, CDNs, external payment networks, and cloud gateways.`,
      sampleLogs: {
        info: [
          `[${project.name}] External API egress packet dispatched successfully`,
          `[${project.name}] OAuth token verification accepted`,
        ],
        warn: [],
        error: [],
        debug: [
          `[${project.name}] Circuit breaker status: CLOSED`,
        ],
        trace: [
          `[${project.name}] Egress TLS handshake completed`,
        ],
      },
      analysis: {
        avgLatency: "84ms",
        p99Latency: "220ms",
        throughput: "140 calls/min",
        errorRate: "0.02%",
        memoryUsage: "80 MB / 256 MB",
        cpuUsage: "6%",
        insights: [
          "External egress latency within SLA expectations.",
        ],
      },
      debugging: {
        activeThreads: 4,
        openSockets: 12,
        heapAllocated: "64 MB",
        gcPauseAvg: "0.4ms",
        recentStackTraces: [],
        probes: [
          { name: "Perimeter Health", status: "passing", latency: "12ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
    {
      id: `${project.id}-async`,
      name: `${project.name} Async & Background Queue`,
      tag: "ASYNC",
      category: "async",
      nodeType: "BACKGROUND_QUEUE_NODE",
      env: "production",
      host: "queue.nexis.internal",
      port: 6379,
      region: "Worker Subsystem",
      status: "online",
      healthScore: 98,
      logRate: "90 lps",
      uptime: "99.98%",
      version: "Task Queue / Worker",
      description: `Async & Background Daemons for ${project.name}: Decoupled task queue, retry loops, cleanup crons, and background workers.`,
      sampleLogs: {
        info: [
          `[${project.name}] Background worker cycle finished cleanly`,
          `[${project.name}] Queue depth: 0 pending items`,
        ],
        warn: [],
        error: [],
        debug: [
          `[${project.name}] Dead Letter Queue check: clean`,
        ],
        trace: [
          `[${project.name}] Worker poll heartbeat`,
        ],
      },
      analysis: {
        avgLatency: "18ms",
        p99Latency: "64ms",
        throughput: "450 tasks/min",
        errorRate: "0.0%",
        memoryUsage: "120 MB / 512 MB",
        cpuUsage: "9%",
        insights: [
          "Zero queue backlog; background workers operating at peak efficiency.",
        ],
      },
      debugging: {
        activeThreads: 6,
        openSockets: 16,
        heapAllocated: "96 MB",
        gcPauseAvg: "0.3ms",
        recentStackTraces: [],
        probes: [
          { name: "Queue Ingestion Pool", status: "passing", latency: "0.4ms" },
        ],
      },
      recommendations: [],
      issues: [],
    },
  ];
}
