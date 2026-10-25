-- Nexis Software Fleet SQLite Schema

CREATE TABLE IF NOT EXISTS softwares (
    id TEXT PRIMARY KEY,                       -- Slug format: 'apex-logistics', 'shulebase-web'
    name TEXT NOT NULL,                        -- Display: 'Apex Logistics'
    category TEXT NOT NULL,                    -- 'Web API', 'Frontend App', 'Microservice', 'Mobile', 'Desktop'
    platform TEXT NOT NULL,                    -- 'Python / Django', 'TypeScript / React', etc.
    local_repo_path TEXT NOT NULL,             -- Absolute disk path: '/home/.../projects/...'
    repo_url TEXT,                             -- Remote Git repository URL
    target_url TEXT,                           -- Live endpoint: 'http://localhost:8000'
    provider TEXT DEFAULT 'custom',            -- 'vercel', 'render', 'railway', 'fly', 'aws', etc.
    provider_api_key TEXT,                     -- Optional platform personal access token / key
    provider_project_id TEXT,                  -- Matched service ID / project ID / app slug
    description TEXT,                          -- Functional overview
    api_key_hash TEXT NOT NULL,                -- SHA-256 hashed secret for telemetry ingestion
    status TEXT NOT NULL DEFAULT 'ACTIVE',     -- 'ACTIVE', 'PAUSED', 'DEGRADED'
    health_score INTEGER NOT NULL DEFAULT 100, -- 0-100 score
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS software_nodes (
    id TEXT PRIMARY KEY,                       -- e.g. 'node-apex-ingress'
    software_id TEXT NOT NULL,
    name TEXT NOT NULL,
    node_type TEXT NOT NULL,                   -- 'INGRESS', 'COMPUTE', 'STORAGE', 'ASYNC'
    endpoint_url TEXT,
    health_status TEXT NOT NULL DEFAULT 'HEALTHY',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (software_id) REFERENCES softwares(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_softwares_status ON softwares(status);
CREATE INDEX IF NOT EXISTS idx_nodes_software_id ON software_nodes(software_id);

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    software_id TEXT NOT NULL,
    system_id TEXT NOT NULL,
    level TEXT NOT NULL,
    tag TEXT NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    metadata TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_software_time ON telemetry_logs(software_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_system_level ON telemetry_logs(system_id, level);

