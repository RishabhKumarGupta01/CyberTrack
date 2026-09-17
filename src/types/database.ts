/**
 * CryptoTrace Intelligence Platform — Database Entity Models & Types
 * 
 * SECURITY DIRECTIVE:
 * Never expose secrets (password hashes, KMS secrets, private seeds, internal JWT keys)
 * in frontend code or client-side responses.
 */

export type UserRole = 'L1 Analyst' | 'L2 Analyst' | 'L3 Analyst' | 'Lead Investigator' | 'Admin';
export type CaseStatus = 'active' | 'in_review' | 'escalated' | 'closed';
export type CasePriority = 'low' | 'medium' | 'high' | 'critical';
export type FraudType = 'pig_butchering' | 'phishing' | 'ransomware' | 'hacks' | 'sanctions_evasion' | 'terrorist_financing' | 'darknet_market' | 'other';
export type BlockchainNetwork = 'Ethereum' | 'Bitcoin' | 'Solana' | 'BNB Chain' | 'Polygon' | 'Tron' | 'Avalanche';
export type CaseNetwork = 'ETH' | 'BTC' | 'SOL' | 'BSC' | 'POLYGON' | 'TRON' | 'AVAX';
export type EntityType = 'Centralized Exchange' | 'DEX' | 'Mixer' | 'Bridge' | 'High-Risk Entity' | 'Sanctioned Entity' | 'Merchant' | 'Mining Pool' | 'Darknet Market';
export type KycLevel = 'Full' | 'Partial/Tiered' | 'None' | 'Unknown';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TransactionStatus = 'confirmed' | 'pending' | 'failed';
export type AlertType = 'NEW_TRANSACTION' | 'HIGH_VALUE_TRANSFER' | 'RAPID_FORWARDING' | 'LAYERING_DETECTED' | 'MIXER_EXPOSURE' | 'EXCHANGE_DEPOSIT' | 'SANCTIONED_COUNTERPARTY' | 'PEELING_CHAIN_DETECTED';
export type EvidenceType = 'TRANSACTION_TRACE' | 'BLOCKCHAIN_LEDGER_EXTRACT' | 'VASP_SUBPOENA_PACKET' | 'AFFIDAVIT_EXHIBIT' | 'CLUSTER_ANALYSIS' | 'WALLET_SNAPSHOT' | 'KMS_SIGNED_HASH';
export type ChainOfCustodyStatus = 'SEALED' | 'IN_REVIEW' | 'COURT_SUBMITTED' | 'ARCHIVED';
export type ReportStatus = 'DRAFT' | 'SUPERVISOR_REVIEW' | 'APPROVED' | 'DISSEMINATED' | 'SUBMITTED_TO_COURT';
export type WatchlistTargetType = 'SUSPECT_WALLET' | 'EXCHANGE_DEPOSIT' | 'SMART_CONTRACT' | 'MIXER_OUTLET' | 'VICTIM_SOURCE' | 'HIGH_ROLLER';
export type AssociationType = 'DIRECT_OWNERSHIP' | 'INTERMEDIARY_HOP' | 'DEPOSIT_PROXY' | 'SMART_CONTRACT_CALLER' | 'COUNTERPARTY' | 'MIXER_PARTICIPANT';

// ============================================================================
// 1. USERS
// ============================================================================
export interface DbUser {
  id: string; // UUID
  name: string;
  email: string;
  /** SENSITIVE: Store hashed on backend only; NEVER expose or send to frontend client! */
  password_hash: string;
  badge_number: string;
  role: UserRole;
  agency: string;
  avatar_url?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Safe Client-Facing User (No Secrets) */
export type SafeUser = Omit<DbUser, 'password_hash'>;

// ============================================================================
// 2. CASES
// ============================================================================
export interface DbCase {
  id: string; // UUID
  case_id: string; // e.g. "INV-2023-0842"
  title: string;
  description?: string | null;
  status: CaseStatus;
  priority: CasePriority;
  fraud_type: FraudType;
  reported_amount_usd: number;
  target_address?: string | null;
  network: CaseNetwork;
  victim_ref?: string | null;
  notes?: string | null;
  assigned_to?: string | null; // UUID -> users.id
  created_by?: string | null; // UUID -> users.id
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 3. ENTITIES
// ============================================================================
export interface DbEntity {
  id: string; // UUID
  entity_id: string; // e.g. "ENT-BINANCE-GLOBAL"
  name: string;
  entity_type: EntityType;
  category?: string | null;
  jurisdiction?: string | null;
  kyc_level: KycLevel;
  attribution_confidence: number; // 0-100
  behavioral_risk_score: number; // 0-100
  is_sanctioned: boolean;
  probable_vasp: boolean;
  subpoena_contact_email?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 4. WALLET CLUSTERS
// ============================================================================
export interface DbWalletCluster {
  id: string; // UUID
  cluster_id: string; // e.g. "CLUST-BTC-8841"
  cluster_name?: string | null;
  blockchain: BlockchainNetwork;
  clustering_algorithm: string;
  confidence_score: number; // 0-100
  total_addresses: number;
  total_volume_usd: number;
  risk_score: number; // 0-100
  suspected_entity_id?: string | null; // UUID -> entities.id
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 5. WALLETS
// ============================================================================
export interface DbWallet {
  id: string; // UUID
  address: string;
  blockchain: BlockchainNetwork;
  balance: string; // Arbitrary precision
  balance_usd: number;
  total_txs: number;
  unique_peers: number;
  risk_score: number; // 0-100
  risk_level: RiskLevel;
  first_active_at?: string | null;
  last_active_at?: string | null;
  ens_domain?: string | null;
  is_monitored: boolean;
  cluster_id?: string | null; // UUID -> wallet_clusters.id
  tags: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 6. ENTITY ADDRESSES
// ============================================================================
export interface DbEntityAddress {
  id: string; // UUID
  entity_id: string; // UUID -> entities.id
  address: string;
  blockchain: BlockchainNetwork;
  tag?: string | null;
  is_verified: boolean;
  confidence_score: number; // 0-100
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  created_at: string;
}

// ============================================================================
// 7. WALLET ENTITY LINKS
// ============================================================================
export interface DbWalletEntityLink {
  id: string; // UUID
  wallet_id: string; // UUID -> wallets.id
  wallet_address: string;
  entity_id: string; // UUID -> entities.id
  association_type: AssociationType;
  confidence_score: number; // 0-100
  attribution_source: string;
  is_confirmed: boolean;
  notes?: string | null;
  created_at: string;
}

// ============================================================================
// 8. TRANSACTIONS
// ============================================================================
export interface DbTransaction {
  id: string; // UUID
  tx_hash: string;
  blockchain: BlockchainNetwork;
  block_number: number;
  block_timestamp: string;
  from_address: string;
  to_address: string;
  amount: string; // BigInt / high-precision string
  amount_usd: number;
  asset_symbol: string;
  tx_fee?: number | null;
  tx_fee_usd?: number | null;
  status: TransactionStatus;
  is_suspicious: boolean;
  risk_flag?: string | null;
  hop_count?: number;
  case_id?: string | null; // UUID -> cases.id
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// 9. RISK ASSESSMENTS
// ============================================================================
export interface DbRiskAssessment {
  id: string; // UUID
  wallet_id?: string | null; // UUID -> wallets.id
  wallet_address: string;
  blockchain: BlockchainNetwork;
  case_id?: string | null; // UUID -> cases.id
  assessed_by?: string | null; // UUID -> users.id
  overall_risk_score: number; // 0-100
  risk_level: RiskLevel;
  sanctions_exposure_score: number;
  mixer_exposure_score: number;
  darknet_exposure_score: number;
  counterparty_risk_score: number;
  velocity_score: number;
  signals: Array<{ type?: string; flag?: string; confidence?: number; hops?: number; [key: string]: unknown }>;
  summary_notes?: string | null;
  assessed_at: string;
  created_at: string;
}

// ============================================================================
// 10. ALERTS
// ============================================================================
export interface DbAlert {
  id: string; // UUID
  alert_type: AlertType;
  severity: CasePriority;
  title: string;
  description: string;
  wallet_address: string;
  blockchain: BlockchainNetwork;
  tx_hash?: string | null;
  case_id?: string | null; // UUID -> cases.id
  entity_id?: string | null; // UUID -> entities.id
  amount_usd?: number | null;
  is_read: boolean;
  is_acknowledged: boolean;
  acknowledged_by?: string | null; // UUID -> users.id
  acknowledged_at?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// 11. WATCHLISTS
// ============================================================================
export interface DbWatchlist {
  id: string; // UUID
  name: string;
  description?: string | null;
  wallet_address: string;
  blockchain: BlockchainNetwork;
  case_id: string; // UUID -> cases.id
  entity_id?: string | null; // UUID -> entities.id
  created_by: string; // UUID -> users.id
  target_type: WatchlistTargetType;
  is_active: boolean;
  alert_threshold_usd?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 12. EVIDENCE
// ============================================================================
export interface DbEvidence {
  id: string; // UUID
  evidence_number: string; // e.g. "EVD-2023-0842-01"
  case_id: string; // UUID -> cases.id
  title: string;
  description?: string | null;
  evidence_type: EvidenceType;
  file_name: string;
  file_size_bytes: number;
  file_mime_type: string;
  storage_path: string;
  sha256_hash: string; // Cryptographic verification hash
  hmac_signature?: string | null;
  chain_of_custody_status: ChainOfCustodyStatus;
  subpoena_hold_active: boolean;
  subpoena_target_entity_id?: string | null; // UUID -> entities.id
  collected_by: string; // UUID -> users.id
  verified_by?: string | null; // UUID -> users.id
  collected_at: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 13. INVESTIGATION REPORTS
// ============================================================================
export interface DbInvestigationReport {
  id: string; // UUID
  report_number: string; // e.g. "REP-INV-2023-0842-FINAL"
  case_id: string; // UUID -> cases.id
  title: string;
  author_id: string; // UUID -> users.id
  classification: string;
  status: ReportStatus;
  summary: string;
  methodology?: string | null;
  findings: Array<Record<string, unknown>>;
  attributed_entity_id?: string | null; // UUID -> entities.id
  seizure_warrant_requested: boolean;
  export_pdf_hash?: string | null;
  digital_signature?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// 14. AUDIT LOGS
// ============================================================================
export interface DbAuditLog {
  id: string; // UUID
  action: string;
  user_id?: string | null; // UUID -> users.id
  user_badge_number: string;
  user_ip_address?: string | null;
  user_agent?: string | null;
  case_id?: string | null; // UUID -> cases.id
  case_reference?: string | null;
  entity_id?: string | null; // UUID -> entities.id
  wallet_address?: string | null;
  tx_hash?: string | null;
  details?: Record<string, unknown>;
  artifact_hash?: string | null;
  prev_log_hash?: string | null;
  tamper_status: 'VERIFIED' | 'FLAGGED' | 'AUDITED';
  created_at: string;
}
