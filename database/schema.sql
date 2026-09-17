-- ============================================================================
-- CryptoTrace Intelligence Platform — Database Schema (PostgreSQL 14+)
-- Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL FORENSICS SYSTEM
-- Purpose: Blockchain Forensics, Fund-Flow Tracing, VASP Intelligence & Auditing
-- ============================================================================

-- Enable UUID extension for cryptographically secure, collision-free identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS
-- Investigators, cyber analysts, task force chiefs, and system administrators.
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- NEVER EXPOSE TO FRONTEND CLIENTS
    badge_number VARCHAR(64) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL CHECK (role IN ('L1 Analyst', 'L2 Analyst', 'L3 Analyst', 'Lead Investigator', 'Admin')),
    agency VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_badge_number ON users(badge_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================================================
-- 2. CASES
-- Law enforcement investigations into illicit crypto activity.
-- ============================================================================
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id VARCHAR(64) NOT NULL UNIQUE, -- e.g. "INV-2023-0842"
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL CHECK (status IN ('active', 'in_review', 'escalated', 'closed')),
    priority VARCHAR(32) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    fraud_type VARCHAR(64) NOT NULL CHECK (fraud_type IN (
        'pig_butchering', 'phishing', 'ransomware', 'hacks', 
        'sanctions_evasion', 'terrorist_financing', 'darknet_market', 'other'
    )),
    reported_amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    target_address VARCHAR(255),
    network VARCHAR(32) NOT NULL CHECK (network IN ('ETH', 'BTC', 'SOL', 'BSC', 'POLYGON', 'TRON', 'AVAX')),
    victim_ref VARCHAR(255),
    notes TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crucial Indexes for Cases
CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_case_id ON cases(case_id);
CREATE INDEX IF NOT EXISTS idx_cases_target_address ON cases(target_address);
CREATE INDEX IF NOT EXISTS idx_cases_network ON cases(network);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_status_priority ON cases(status, priority);

-- ============================================================================
-- 3. ENTITIES
-- Identified physical/legal entities (Exchanges, Mixers, Bridges, Sanctioned Groups).
-- ============================================================================
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id VARCHAR(64) NOT NULL UNIQUE, -- e.g. "ENT-BINANCE-GLOBAL", "ENT-TORNADO-CASH"
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(64) NOT NULL CHECK (entity_type IN (
        'Centralized Exchange', 'DEX', 'Mixer', 'Bridge', 
        'High-Risk Entity', 'Sanctioned Entity', 'Merchant', 
        'Mining Pool', 'Darknet Market'
    )),
    category VARCHAR(64),
    jurisdiction VARCHAR(128),
    kyc_level VARCHAR(32) NOT NULL CHECK (kyc_level IN ('Full', 'Partial/Tiered', 'None', 'Unknown')),
    attribution_confidence SMALLINT NOT NULL DEFAULT 0 CHECK (attribution_confidence BETWEEN 0 AND 100),
    behavioral_risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (behavioral_risk_score BETWEEN 0 AND 100),
    is_sanctioned BOOLEAN NOT NULL DEFAULT FALSE,
    probable_vasp BOOLEAN NOT NULL DEFAULT TRUE,
    subpoena_contact_email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crucial Indexes for Entities
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_entity_id ON entities(entity_id);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_risk ON entities(behavioral_risk_score);
CREATE INDEX IF NOT EXISTS idx_entities_created_at ON entities(created_at);

-- ============================================================================
-- 4. WALLET CLUSTERS
-- Algorithmic clusters of addresses linked by common-ownership heuristics.
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_id VARCHAR(64) NOT NULL UNIQUE, -- e.g. "CLUST-BTC-8841"
    cluster_name VARCHAR(255),
    blockchain VARCHAR(32) NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    clustering_algorithm VARCHAR(64) NOT NULL, -- e.g. "Multi-Input Common Ownership", "Deposit Sweep"
    confidence_score SMALLINT NOT NULL DEFAULT 80 CHECK (confidence_score BETWEEN 0 AND 100),
    total_addresses INTEGER NOT NULL DEFAULT 0,
    total_volume_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    suspected_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_clusters_cluster_id ON wallet_clusters(cluster_id);
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_blockchain ON wallet_clusters(blockchain);
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_suspected_entity_id ON wallet_clusters(suspected_entity_id);
CREATE INDEX IF NOT EXISTS idx_wallet_clusters_created_at ON wallet_clusters(created_at);

-- ============================================================================
-- 5. WALLETS
-- On-chain addresses subject to forensic tracing, risk assessment, and surveillance.
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(255) NOT NULL,
    blockchain VARCHAR(32) NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
    balance_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    total_txs INTEGER NOT NULL DEFAULT 0,
    unique_peers INTEGER NOT NULL DEFAULT 0,
    risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    risk_level VARCHAR(16) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    first_active_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    ens_domain VARCHAR(255),
    is_monitored BOOLEAN NOT NULL DEFAULT FALSE,
    cluster_id UUID REFERENCES wallet_clusters(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wallet_address_blockchain UNIQUE (address, blockchain)
);

-- Crucial Indexes for Wallets
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_blockchain ON wallets(blockchain);
CREATE INDEX IF NOT EXISTS idx_wallets_address_blockchain ON wallets(address, blockchain);
CREATE INDEX IF NOT EXISTS idx_wallets_cluster_id ON wallets(cluster_id);
CREATE INDEX IF NOT EXISTS idx_wallets_risk_score ON wallets(risk_score);
CREATE INDEX IF NOT EXISTS idx_wallets_risk_level ON wallets(risk_level);
CREATE INDEX IF NOT EXISTS idx_wallets_last_active_at ON wallets(last_active_at);
CREATE INDEX IF NOT EXISTS idx_wallets_created_at ON wallets(created_at);

-- ============================================================================
-- 6. ENTITY ADDRESSES
-- Known or attributed addresses belonging to classified entities.
-- ============================================================================
CREATE TABLE IF NOT EXISTS entity_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    address VARCHAR(255) NOT NULL,
    blockchain VARCHAR(32) NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    tag VARCHAR(128), -- e.g. "Cold Storage #4", "Deposit Proxy 2", "Router"
    is_verified BOOLEAN NOT NULL DEFAULT TRUE,
    confidence_score SMALLINT NOT NULL DEFAULT 100 CHECK (confidence_score BETWEEN 0 AND 100),
    first_seen_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_entity_address_blockchain UNIQUE (entity_id, address, blockchain)
);

-- Crucial Indexes for Entity Addresses
CREATE INDEX IF NOT EXISTS idx_entity_addresses_entity_id ON entity_addresses(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_address ON entity_addresses(address);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_blockchain ON entity_addresses(blockchain);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_composite ON entity_addresses(address, blockchain);
CREATE INDEX IF NOT EXISTS idx_entity_addresses_created_at ON entity_addresses(created_at);

-- ============================================================================
-- 7. WALLET ENTITY LINKS
-- Linkages and forensic attributions between specific wallets and entities.
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_entity_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    association_type VARCHAR(64) NOT NULL CHECK (association_type IN (
        'DIRECT_OWNERSHIP', 'INTERMEDIARY_HOP', 'DEPOSIT_PROXY', 
        'SMART_CONTRACT_CALLER', 'COUNTERPARTY', 'MIXER_PARTICIPANT'
    )),
    confidence_score SMALLINT NOT NULL DEFAULT 85 CHECK (confidence_score BETWEEN 0 AND 100),
    attribution_source VARCHAR(128) NOT NULL, -- e.g. "OFAC SDN List", "VASP Subpoena Response", "Heuristic Trace"
    is_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wallet_entity_link UNIQUE (wallet_id, entity_id, association_type)
);

-- Crucial Indexes for Wallet Entity Links
CREATE INDEX IF NOT EXISTS idx_wallet_entity_links_wallet_id ON wallet_entity_links(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_entity_links_wallet_address ON wallet_entity_links(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_entity_links_entity_id ON wallet_entity_links(entity_id);
CREATE INDEX IF NOT EXISTS idx_wallet_entity_links_created_at ON wallet_entity_links(created_at);

-- ============================================================================
-- 8. TRANSACTIONS
-- Raw and enriched blockchain ledger transactions tracked during investigations.
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash VARCHAR(255) NOT NULL,
    blockchain VARCHAR(32) NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    block_number BIGINT NOT NULL,
    block_timestamp TIMESTAMPTZ NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    amount NUMERIC(36, 18) NOT NULL,
    amount_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    asset_symbol VARCHAR(16) NOT NULL, -- e.g. 'ETH', 'BTC', 'USDT', 'USDC'
    tx_fee NUMERIC(24, 10) DEFAULT 0,
    tx_fee_usd NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(16) NOT NULL CHECK (status IN ('confirmed', 'pending', 'failed')),
    is_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
    risk_flag VARCHAR(64), -- e.g. 'PEELING_CHAIN', 'RAPID_FORWARD', 'MIXER_DEPOSIT', 'STRUCTURING'
    hop_count INTEGER DEFAULT 0,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tx_hash_blockchain UNIQUE (tx_hash, blockchain)
);

-- Crucial Indexes for Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_blockchain ON transactions(blockchain);
CREATE INDEX IF NOT EXISTS idx_transactions_from_address ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to_address ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_block_timestamp ON transactions(block_timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_case_id ON transactions(case_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_from_time ON transactions(from_address, block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_to_time ON transactions(to_address, block_timestamp DESC);

-- ============================================================================
-- 9. RISK ASSESSMENTS
-- Comprehensive ML and rule-based risk evaluation snapshots for wallets/cases.
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    blockchain VARCHAR(32) NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    assessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    overall_risk_score SMALLINT NOT NULL CHECK (overall_risk_score BETWEEN 0 AND 100),
    risk_level VARCHAR(16) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    sanctions_exposure_score SMALLINT NOT NULL DEFAULT 0 CHECK (sanctions_exposure_score BETWEEN 0 AND 100),
    mixer_exposure_score SMALLINT NOT NULL DEFAULT 0 CHECK (mixer_exposure_score BETWEEN 0 AND 100),
    darknet_exposure_score SMALLINT NOT NULL DEFAULT 0 CHECK (darknet_exposure_score BETWEEN 0 AND 100),
    counterparty_risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (counterparty_risk_score BETWEEN 0 AND 100),
    velocity_score SMALLINT NOT NULL DEFAULT 0 CHECK (velocity_score BETWEEN 0 AND 100),
    signals JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"type": "OFAC_PROXIMITY", "hops": 2}]
    summary_notes TEXT,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crucial Indexes for Risk Assessments
CREATE INDEX IF NOT EXISTS idx_risk_assessments_wallet_address ON risk_assessments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_blockchain ON risk_assessments(blockchain);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_case_id ON risk_assessments(case_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_assessed_at ON risk_assessments(assessed_at);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_at ON risk_assessments(created_at);

-- ============================================================================
-- 10. ALERTS
-- Real-time algorithmic alerts generated during active surveillance.
-- ============================================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(64) NOT NULL CHECK (alert_type IN (
        'NEW_TRANSACTION', 'HIGH_VALUE_TRANSFER', 'RAPID_FORWARDING', 
        'LAYERING_DETECTED', 'MIXER_EXPOSURE', 'EXCHANGE_DEPOSIT', 
        'SANCTIONED_COUNTERPARTY', 'PEELING_CHAIN_DETECTED'
    )),
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    blockchain VARCHAR(32) NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    tx_hash VARCHAR(255),
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    amount_usd NUMERIC(18, 2),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crucial Indexes for Alerts
CREATE INDEX IF NOT EXISTS idx_alerts_wallet_address ON alerts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_alerts_blockchain ON alerts(blockchain);
CREATE INDEX IF NOT EXISTS idx_alerts_tx_hash ON alerts(tx_hash);
CREATE INDEX IF NOT EXISTS idx_alerts_case_id ON alerts(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_entity_id ON alerts(entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, severity) WHERE is_read = FALSE;

-- ============================================================================
-- 11. WATCHLISTS
-- Investigator surveillance targets configured for automated monitoring.
-- ============================================================================
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    wallet_address VARCHAR(255) NOT NULL,
    blockchain VARCHAR(32) NOT NULL CHECK (blockchain IN ('Ethereum', 'Bitcoin', 'Solana', 'BNB Chain', 'Polygon', 'Tron', 'Avalanche')),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(32) NOT NULL CHECK (target_type IN (
        'SUSPECT_WALLET', 'EXCHANGE_DEPOSIT', 'SMART_CONTRACT', 
        'MIXER_OUTLET', 'VICTIM_SOURCE', 'HIGH_ROLLER'
    )),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    alert_threshold_usd NUMERIC(18, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crucial Indexes for Watchlists
CREATE INDEX IF NOT EXISTS idx_watchlists_wallet_address ON watchlists(wallet_address);
CREATE INDEX IF NOT EXISTS idx_watchlists_blockchain ON watchlists(blockchain);
CREATE INDEX IF NOT EXISTS idx_watchlists_case_id ON watchlists(case_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_entity_id ON watchlists(entity_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_created_by ON watchlists(created_by);
CREATE INDEX IF NOT EXISTS idx_watchlists_created_at ON watchlists(created_at);

-- ============================================================================
-- 12. EVIDENCE
-- Cryptographically sealed forensic artifacts with verifiable SHA-256 hashes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_number VARCHAR(64) NOT NULL UNIQUE, -- e.g. "EVD-2023-0842-01"
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_type VARCHAR(64) NOT NULL CHECK (evidence_type IN (
        'TRANSACTION_TRACE', 'BLOCKCHAIN_LEDGER_EXTRACT', 'VASP_SUBPOENA_PACKET', 
        'AFFIDAVIT_EXHIBIT', 'CLUSTER_ANALYSIS', 'WALLET_SNAPSHOT', 'KMS_SIGNED_HASH'
    )),
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_mime_type VARCHAR(128) NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL, -- Cryptographic integrity hash
    hmac_signature VARCHAR(128),
    chain_of_custody_status VARCHAR(32) NOT NULL CHECK (chain_of_custody_status IN (
        'SEALED', 'IN_REVIEW', 'COURT_SUBMITTED', 'ARCHIVED'
    )),
    subpoena_hold_active BOOLEAN NOT NULL DEFAULT FALSE,
    subpoena_target_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    collected_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crucial Indexes for Evidence
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_number ON evidence(evidence_number);
CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_entity_id ON evidence(subpoena_target_entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_sha256_hash ON evidence(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_collected_at ON evidence(collected_at);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at);

-- ============================================================================
-- 13. INVESTIGATION REPORTS
-- Official court-admissible dossiers, forensic findings, and export packages.
-- ============================================================================
CREATE TABLE IF NOT EXISTS investigation_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number VARCHAR(64) NOT NULL UNIQUE, -- e.g. "REP-INV-2023-0842-FINAL"
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    classification VARCHAR(64) NOT NULL DEFAULT 'LAW ENFORCEMENT SENSITIVE // REL TO LEA ONLY',
    status VARCHAR(32) NOT NULL CHECK (status IN ('DRAFT', 'SUPERVISOR_REVIEW', 'APPROVED', 'DISSEMINATED', 'SUBMITTED_TO_COURT')),
    summary TEXT NOT NULL,
    methodology TEXT,
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    attributed_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    seizure_warrant_requested BOOLEAN NOT NULL DEFAULT FALSE,
    export_pdf_hash VARCHAR(64),
    digital_signature TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crucial Indexes for Investigation Reports
CREATE UNIQUE INDEX IF NOT EXISTS idx_investigation_reports_report_number ON investigation_reports(report_number);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_case_id ON investigation_reports(case_id);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_author_id ON investigation_reports(author_id);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_entity_id ON investigation_reports(attributed_entity_id);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_status ON investigation_reports(status);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_created_at ON investigation_reports(created_at);

-- ============================================================================
-- 14. AUDIT LOGS
-- Immutable, tamper-evident chronological event log (Append-only).
-- Meets CJIS, FedRAMP High, and chain-of-custody evidentiary standards.
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(64) NOT NULL, -- e.g. 'CASE_INITIALIZATION', 'REPORT_EXPORT_PDF', 'VASP_SUBPOENA_PACKET_GEN'
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_badge_number VARCHAR(64) NOT NULL,
    user_ip_address VARCHAR(45),
    user_agent TEXT,
    case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
    case_reference VARCHAR(64),
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    wallet_address VARCHAR(255),
    tx_hash VARCHAR(255),
    details JSONB DEFAULT '{}'::jsonb,
    artifact_hash VARCHAR(64), -- SHA-256 hash of the targeted artifact
    prev_log_hash VARCHAR(64), -- Cryptographic backwards hash link
    tamper_status VARCHAR(16) NOT NULL DEFAULT 'VERIFIED' CHECK (tamper_status IN ('VERIFIED', 'FLAGGED', 'AUDITED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crucial Indexes for Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_wallet_address ON audit_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tx_hash ON audit_logs(tx_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- AUTOMATED TIMESTAMP TRIGGERS
-- Keeps updated_at synchronized automatically on row updates.
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_entities_updated_at BEFORE UPDATE ON entities FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_wallet_clusters_updated_at BEFORE UPDATE ON wallet_clusters FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_watchlists_updated_at BEFORE UPDATE ON watchlists FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_evidence_updated_at BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
CREATE OR REPLACE TRIGGER trg_investigation_reports_updated_at BEFORE UPDATE ON investigation_reports FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column();
