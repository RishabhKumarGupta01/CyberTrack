-- ============================================================================
-- CryptoTrace Intelligence Platform — SQLite Database Schema
-- Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL FORENSICS SYSTEM
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- NEVER EXPOSE TO FRONTEND CLIENTS
    badge_number TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('L1 Analyst', 'L2 Analyst', 'L3 Analyst', 'Lead Investigator', 'Admin')),
    agency TEXT NOT NULL,
    avatar_url TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_badge_number ON users(badge_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 2. CASES
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'in_review', 'escalated', 'closed')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    fraud_type TEXT NOT NULL CHECK (fraud_type IN (
        'pig_butchering', 'phishing', 'ransomware', 'hacks', 
        'sanctions_evasion', 'terrorist_financing', 'darknet_market', 'other'
    )),
    reported_amount_usd REAL NOT NULL DEFAULT 0.00,
    target_address TEXT,
    network TEXT NOT NULL CHECK (network IN ('ETH', 'BTC', 'SOL', 'BSC', 'POLYGON', 'TRON', 'AVAX')),
    victim_ref TEXT,
    notes TEXT,
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_case_id ON cases(case_id);
CREATE INDEX IF NOT EXISTS idx_cases_target_address ON cases(target_address);
CREATE INDEX IF NOT EXISTS idx_cases_network ON cases(network);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);

-- 3. ENTITIES
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'Centralized Exchange', 'DEX', 'Mixer', 'Bridge', 
        'High-Risk Entity', 'Sanctioned Entity', 'Merchant', 
        'Mining Pool', 'Darknet Market'
    )),
    category TEXT,
    jurisdiction TEXT,
    kyc_level TEXT NOT NULL CHECK (kyc_level IN ('Full', 'Partial/Tiered', 'None', 'Unknown')),
    attribution_confidence INTEGER NOT NULL DEFAULT 0 CHECK (attribution_confidence BETWEEN 0 AND 100),
    behavioral_risk_score INTEGER NOT NULL DEFAULT 0 CHECK (behavioral_risk_score BETWEEN 0 AND 100),
    is_sanctioned INTEGER NOT NULL DEFAULT 0,
    probable_vasp INTEGER NOT NULL DEFAULT 1,
    subpoena_contact_email TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_entity_id ON entities(entity_id);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_created_at ON entities(created_at);

-- 4. WALLET CLUSTERS
CREATE TABLE IF NOT EXISTS wallet_clusters (
    id TEXT PRIMARY KEY,
    cluster_id TEXT NOT NULL UNIQUE,
    cluster_name TEXT,
    blockchain TEXT NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    clustering_algorithm TEXT NOT NULL,
    confidence_score INTEGER NOT NULL DEFAULT 80 CHECK (confidence_score BETWEEN 0 AND 100),
    total_addresses INTEGER NOT NULL DEFAULT 0,
    total_volume_usd REAL NOT NULL DEFAULT 0.00,
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    suspected_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_clusters_cluster_id ON wallet_clusters(cluster_id);
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_blockchain ON wallet_clusters(blockchain);
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_suspected_entity_id ON wallet_clusters(suspected_entity_id);
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_created_at ON wallet_clusters(created_at);

-- 5. WALLETS
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    blockchain TEXT NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    balance REAL NOT NULL DEFAULT 0,
    balance_usd REAL NOT NULL DEFAULT 0.00,
    total_txs INTEGER NOT NULL DEFAULT 0,
    unique_peers INTEGER NOT NULL DEFAULT 0,
    risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    first_active_at TEXT,
    last_active_at TEXT,
    ens_domain TEXT,
    is_monitored INTEGER NOT NULL DEFAULT 0,
    cluster_id TEXT REFERENCES wallet_clusters(id) ON DELETE SET NULL,
    tags TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (address, blockchain)
);

CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_blockchain ON wallets(blockchain);
CREATE INDEX IF NOT EXISTS idx_wallets_address_blockchain ON wallets(address, blockchain);
CREATE INDEX IF NOT EXISTS idx_wallets_cluster_id ON wallets(cluster_id);
CREATE INDEX IF NOT EXISTS idx_wallets_last_active_at ON wallets(last_active_at);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets(created_at);

-- 6. ENTITY ADDRESSES
CREATE TABLE IF NOT EXISTS entity_addresses (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    blockchain TEXT NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    tag TEXT,
    is_verified INTEGER NOT NULL DEFAULT 1,
    confidence_score INTEGER NOT NULL DEFAULT 100 CHECK (confidence_score BETWEEN 0 AND 100),
    first_seen_at TEXT,
    last_seen_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (entity_id, address, blockchain)
);

CREATE INDEX IF NOT EXISTS idx_entity_addresses_entity_id ON entity_addresses(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_address ON entity_addresses(address);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_blockchain ON entity_addresses(blockchain);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_composite ON entity_addresses(address, blockchain);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_created_at ON entity_addresses(created_at);

-- 7. WALLET ENTITY LINKS
CREATE TABLE IF NOT EXISTS wallet_entity_links (
    id TEXT PRIMARY KEY,
    wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    association_type TEXT NOT NULL CHECK (association_type IN (
        'DIRECT_OWNERSHIP', 'INTERMEDIARY_HOP', 'DEPOSIT_PROXY', 
        'SMART_CONTRACT_CALLER', 'COUNTERPARTY', 'MIXER_PARTICIPANT'
    )),
    confidence_score INTEGER NOT NULL DEFAULT 85 CHECK (confidence_score BETWEEN 0 AND 100),
    attribution_source TEXT NOT NULL,
    is_confirmed INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (wallet_id, entity_id, association_type)
);

CREATE INDEX IF NOT EXISTS idx_wallet_entity_links_wallet_id ON wallet_entity_links(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_entity_links_wallet_address ON wallet_entity_links(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_entity_links_entity_id ON wallet_entity_links(entity_id);
CREATE INDEX IF NOT EXISTS idx_wallet_entity_links_created_at ON wallet_entity_links(created_at);

-- 8. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    tx_hash TEXT NOT NULL,
    blockchain TEXT NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    block_number INTEGER NOT NULL,
    block_timestamp TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    amount REAL NOT NULL,
    amount_usd REAL NOT NULL DEFAULT 0.00,
    asset_symbol TEXT NOT NULL,
    tx_fee REAL DEFAULT 0,
    tx_fee_usd REAL DEFAULT 0.00,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'pending', 'failed')),
    is_suspicious INTEGER NOT NULL DEFAULT 0,
    risk_flag TEXT,
    hop_count INTEGER DEFAULT 0,
    case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tx_hash, blockchain)
);

CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_blockchain ON transactions(blockchain);
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_block_timestamp ON transactions(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_case_id ON transactions(case_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- 9. RISK ASSESSMENTS
CREATE TABLE IF NOT EXISTS risk_assessments (
    id TEXT PRIMARY KEY,
    wallet_id TEXT REFERENCES wallets(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    blockchain TEXT NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
    assessed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    overall_risk_score INTEGER NOT NULL CHECK (overall_risk_score BETWEEN 0 AND 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    sanctions_exposure_score INTEGER NOT NULL DEFAULT 0,
    mixer_exposure_score INTEGER NOT NULL DEFAULT 0,
    darknet_exposure_score INTEGER NOT NULL DEFAULT 0,
    counterparty_risk_score INTEGER NOT NULL DEFAULT 0,
    velocity_score INTEGER NOT NULL DEFAULT 0,
    signals TEXT NOT NULL DEFAULT '[]',
    summary_notes TEXT,
    assessed_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_wallet_address ON risk_assessments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_blockchain ON risk_assessments(blockchain);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_case_id ON risk_assessments(case_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed_at ON risk_assessments(assessed_at);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_at ON risk_assessments(created_at);

-- 10. ALERTS
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'NEW_TRANSACTION', 'HIGH_VALUE_TRANSFER', 'RAPID_FORWARDING', 
        'LAYERING_DETECTED', 'MIXER_EXPOSURE', 'EXCHANGE_DEPOSIT', 
        'SANCTIONED_COUNTERPARTY', 'PEELING_CHAIN_DETECTED'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    blockchain TEXT NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    tx_hash TEXT,
    case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
    entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
    amount_usd REAL,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_wallet_address ON alerts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_alerts_blockchain ON alerts(blockchain);
CREATE INDEX IF NOT EXISTS idx_alerts_tx_hash ON alerts(tx_hash);
CREATE INDEX IF NOT EXISTS idx_alerts_case_id ON alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_entity_id ON alerts(entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- 11. WATCHLISTS
CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    wallet_address TEXT NOT NULL,
    blockchain TEXT NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
    entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN (
        'SUSPECT_WALLET', 'EXCHANGE_DEPOSIT', 'SMART_CONTRACT', 
        'MIXER_OUTLET', 'VICTIM_SOURCE', 'HIGH_ROLLER'
    )),
    is_active INTEGER NOT NULL DEFAULT 1,
    alert_threshold_usd REAL DEFAULT 0.00,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_watchlists_wallet_address ON watchlists(wallet_address);
CREATE INDEX IF NOT EXISTS idx_watchlists_blockchain ON watchlists(blockchain);
CREATE INDEX IF NOT EXISTS idx_watchlists_case_id ON watchlists(case_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_entity_id ON watchlists(entity_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_created_by ON watchlists(created_by);
CREATE INDEX IF NOT EXISTS idx_watchlists_created_at ON watchlists(created_at);

-- 12. EVIDENCE
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    evidence_number TEXT NOT NULL UNIQUE,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    evidence_type TEXT NOT NULL CHECK (evidence_type IN (
        'TRANSACTION_TRACE', 'BLOCKCHAIN_LEDGER_EXTRACT', 'VASP_SUBPOENA_PACKET', 
        'AFFIDAVIT_EXHIBIT', 'CLUSTER_ANALYSIS', 'WALLET_SNAPSHOT', 'KMS_SIGNED_HASH'
    )),
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    hmac_signature TEXT,
    chain_of_custody_status TEXT NOT NULL CHECK (chain_of_custody_status IN (
        'SEALED', 'IN_REVIEW', 'COURT_SUBMITTED', 'ARCHIVED'
    )),
    subpoena_hold_active INTEGER NOT NULL DEFAULT 0,
    subpoena_target_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
    collected_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    collected_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_number ON evidence(evidence_number);
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_entity_id ON evidence(subpoena_target_entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_sha256_hash ON evidence(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_collected_at ON evidence(collected_at);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at);

-- 13. INVESTIGATION REPORTS
CREATE TABLE IF NOT EXISTS investigation_reports (
    id TEXT PRIMARY KEY,
    report_number TEXT NOT NULL UNIQUE,
    case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    classification TEXT NOT NULL DEFAULT 'LAW ENFORCEMENT SENSITIVE // REL TO LEA ONLY',
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUPERVISOR_REVIEW', 'APPROVED', 'DISSEMINATED', 'SUBMITTED_TO_COURT')),
    summary TEXT NOT NULL,
    methodology TEXT,
    findings TEXT NOT NULL DEFAULT '[]',
    attributed_entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
    seizure_warrant_requested INTEGER NOT NULL DEFAULT 0,
    export_pdf_hash TEXT,
    digital_signature TEXT,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_investigation_reports_report_number ON investigation_reports(report_number);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_case_id ON investigation_reports(case_id);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_author_id ON investigation_reports(author_id);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_entity_id ON investigation_reports(attributed_entity_id);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_created_at ON investigation_reports(created_at);

-- 14. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_badge_number TEXT NOT NULL,
    user_ip_address TEXT,
    user_agent TEXT,
    case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
    case_reference TEXT,
    entity_id TEXT REFERENCES entities(id) ON DELETE SET NULL,
    wallet_address TEXT,
    tx_hash TEXT,
    details TEXT DEFAULT '{}',
    artifact_hash TEXT,
    prev_log_hash TEXT,
    tamper_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (tamper_status IN ('VERIFIED', 'FLAGGED', 'AUDITED')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_wallet_address ON audit_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tx_hash ON audit_logs(tx_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
