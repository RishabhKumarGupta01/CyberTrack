/**
 * CryptoTrace Intelligence Platform — Investigation Report & Provenance Types
 * 
 * Defines schemas for:
 * 1. Complete Investigator-Ready Forensic Reports containing all 14 mandated fields:
 *    - Case ID
 *    - Wallet
 *    - Blockchain
 *    - Risk score
 *    - Risk factors
 *    - Transaction timeline
 *    - Fund-flow path
 *    - Intermediary wallets
 *    - Probable VASP
 *    - Attribution confidence
 *    - Evidence references
 *    - Analysis timestamp
 *    - Model/rule version
 *    - Investigator notes
 * 2. Evidence Provenance & Cryptographic Audit Trail
 */

export interface RiskFactorSummary {
  indicator: string;
  name: string;
  score_impact: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence: string;
}

export interface TimelineTransaction {
  hop_number: number;
  timestamp: string; // ISO UTC or formatted
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: string;
  asset: string;
  amount_usd: number;
  transaction_type: string;
  is_suspicious?: boolean;
}

export interface FundFlowHop {
  hop_index: number;
  source_node: string;
  source_label: string;
  target_node: string;
  target_label: string;
  action_type: 'TRANSFER' | 'SWAP' | 'BRIDGE' | 'DEPOSIT' | 'WITHDRAWAL';
  amount: string;
  asset: string;
  volume_usd: number;
  tx_hash: string;
}

export interface IntermediaryWalletSummary {
  address: string;
  label: string;
  blockchain: string;
  role: string;
  retention_time_minutes: number;
  total_forwarded_usd: number;
  risk_rating: number;
}

export interface EvidenceReferenceItem {
  evidence_id: string; // e.g. "EVD-2023-0842-01"
  title: string;
  type: string;
  storage_uri: string;
  sha256_hash: string;
  chain_of_custody_status: 'SEALED' | 'IN_REVIEW' | 'COURT_SUBMITTED' | 'ARCHIVED';
  verified_by: string;
}

/**
 * 14-Field Investigator-Ready Report Schema
 */
export interface InvestigationReportData {
  // Field 1: Case ID
  case_id: string;

  // Field 2: Wallet
  wallet: string;

  // Field 3: Blockchain
  blockchain: string;

  // Field 4: Risk score (0-100)
  risk_score: number;

  // Field 5: Risk factors
  risk_factors: RiskFactorSummary[];

  // Field 6: Transaction timeline
  transaction_timeline: TimelineTransaction[];

  // Field 7: Fund-flow path
  fund_flow_path: FundFlowHop[];

  // Field 8: Intermediary wallets
  intermediary_wallets: IntermediaryWalletSummary[];

  // Field 9: Probable VASP
  probable_vasp: string | null;

  // Field 10: Attribution confidence (0-100%)
  attribution_confidence: number;

  // Field 11: Evidence references
  evidence_references: EvidenceReferenceItem[];

  // Field 12: Analysis timestamp (ISO 8601 UTC)
  analysis_timestamp: string;

  // Field 13: Model/rule version
  model_rule_version: string;

  // Field 14: Investigator notes
  investigator_notes: string;

  // Forensic Evidentiary Metadata & Provenance
  report_id: string;
  classification: string;
  analyst_name: string;
  badge_number: string;
  agency: string;
  report_sha256: string;
  digital_signature: string;
  statutory_basis: string;
}

/**
 * Immutable Audit Log Record
 */
export interface AuditLogRecord {
  id: string;
  action: 'REPORT_GENERATED' | 'REPORT_EXPORT_PDF' | 'REPORT_EXPORT_JSON' | 'EVIDENCE_VERIFIED' | 'VASP_SUBPOENA_PACKET_GEN';
  user_name: string;
  user_badge_number: string;
  case_id: string;
  wallet_address: string;
  artifact_hash: string;
  details: Record<string, unknown>;
  timestamp: string;
  tamper_status: 'VERIFIED' | 'FLAGGED';
}
