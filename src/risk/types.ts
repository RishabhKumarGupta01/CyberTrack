/**
 * CryptoTrace Intelligence Platform — Risk Engine Types
 * 
 * EXPLAINABLE RISK SCORING SYSTEM (0–100)
 * 
 * LEGAL EVIDENTIARY STANDARD:
 * Risk scores evaluate quantitative blockchain behavioral signals and exposure factors.
 * They MUST NEVER claim criminal ownership or criminal guilt.
 * 
 * METRIC SEPARATION PRINCIPLE:
 * RISK SCORE (behavioral suspiciousness & exposure) is fundamentally different from
 * VASP ATTRIBUTION CONFIDENCE (identity/institutional classification certainty).
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskIndicatorCode =
  | 'RAPID_FUND_MOVEMENT'
  | 'HIGH_TRANSACTION_VELOCITY'
  | 'LAYERING_DEPTH'
  | 'HIGH_RISK_ENTITY_EXPOSURE'
  | 'MIXER_EXPOSURE'
  | 'BRIDGE_ACTIVITY'
  | 'UNUSUAL_TRANSACTION_PATTERNS'
  | 'HIGH_VALUE_TRANSFERS'
  | 'INTERMEDIARY_WALLET_COUNT';

/**
 * Detailed explainable risk factor contributing to the composite risk score
 */
export interface RiskFactor {
  /** Indicator code identifier */
  indicator: RiskIndicatorCode;

  /** Human-readable name */
  name: string;

  /** Severity classification */
  severity: RiskLevel;

  /** Numerical score impact added to composite score (e.g. +25) */
  score_impact: number;

  /** Clear plain-English forensic rationale */
  description: string;

  /** Underlying verifiable on-chain evidence */
  evidence: string;

  /** Optional granular telemetry metadata */
  details?: Record<string, any>;
}

/**
 * Input context provided to the Risk Engine for evaluation
 */
export interface RiskEngineInput {
  target_address: string;
  blockchain?: string;
  transactions?: Array<{
    tx_hash: string;
    from_address: string;
    to_address: string;
    amount: string | number;
    amount_usd: number;
    asset: string;
    timestamp: number;
    block_number: number;
    direction?: 'incoming' | 'outgoing';
  }>;
  hops_from_source?: number;
  mixer_exposure?: {
    direct_interaction: boolean;
    mixer_name?: string;
    volume_usd?: number;
    hops?: number;
  };
  bridge_activity?: {
    used_bridge: boolean;
    bridge_name?: string;
    target_chain?: string;
    volume_usd?: number;
  };
  high_risk_exposure?: {
    is_exposed: boolean;
    entity_name?: string;
    entity_type?: string;
    hops?: number;
  };
  intermediary_wallets?: Array<{
    address: string;
    retention_rate_pct: number;
    transit_duration_sec: number;
  }>;
  velocity_metrics?: {
    tx_count_last_24h?: number;
    tx_count_last_1h?: number;
    burst_transactions?: number;
  };
}

/**
 * Metric Separation Record:
 * Strictly distinguishes Risk Score from VASP Attribution Confidence
 */
export interface MetricSeparationAnalysis {
  risk_score: number; // 0 to 100 (Measure of behavioral threat/laundering exposure)
  vasp_attribution_confidence: number; // 0 to 100% (Measure of institutional identification certainty)
  attributed_entity_name: string | null;
  metric_contrast_explanation: string;
}

/**
 * Standardized Return Object from the Risk Engine
 * Required fields:
 * - risk_score (0–100)
 * - risk_level ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')
 * - risk_factors (array of explainable factors)
 * - explanation (plain-English synthesis narrative)
 */
export interface RiskAssessmentResult {
  /** Target subject address evaluated */
  target_address: string;

  /** Target blockchain network */
  blockchain: string;

  /** Composite explainable risk score strictly between 0 and 100 */
  risk_score: number;

  /** Risk level band: LOW (0-39), MEDIUM (40-69), HIGH (70-84), CRITICAL (85-100) */
  risk_level: RiskLevel;

  /** Explainable breakdown of all active risk factors with evidence */
  risk_factors: RiskFactor[];

  /** Transparent narrative explanation synthesizing the score breakdown */
  explanation: string;

  /** Distinct separation of Risk Score vs VASP Attribution Confidence */
  metric_separation: MetricSeparationAnalysis;

  /** ISO 8601 evaluation timestamp */
  assessed_at: string;

  /** Evidentiary legal disclaimer enforcing non-guilt standards */
  legal_disclaimer: string;
}
