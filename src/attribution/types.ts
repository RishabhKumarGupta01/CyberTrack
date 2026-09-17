/**
 * CryptoTrace Intelligence Platform — Entity Intelligence & Probable Attribution Types
 * 
 * LEGAL NOTICE & EVIDENTIARY STANDARD:
 * In accordance with blockchain forensic best practices and legal guidelines (e.g. DOJ/FinCEN/FATF),
 * probabilistic attribution MUST NEVER be represented as confirmed legal ownership.
 * All heuristic verdicts use qualified language: "Probable VASP", "Likely associated", "Attribution confidence".
 */

export type AttributionEntityType =
  | 'VASP'
  | 'Centralized Exchange'
  | 'DEX'
  | 'Mixer'
  | 'Bridge'
  | 'Merchant'
  | 'Mining Pool'
  | 'High-Risk Entity'
  | 'Sanctioned Entity'
  | 'Payment Processor';

export type AttributionChain =
  | 'Ethereum'
  | 'Bitcoin'
  | 'Solana'
  | 'TRON'
  | 'Avalanche'
  | 'Multi-Chain';

export type AttributionVerdict =
  | 'Probable VASP'
  | 'Likely associated'
  | 'Unattributed / Unknown';

export type AttributionHeuristicType =
  | 'KNOWN_ADDRESS'
  | 'CLUSTER_RELATIONSHIP'
  | 'TRANSACTION_BEHAVIOR'
  | 'HISTORICAL_INTERACTION'
  | 'GRAPH_PROXIMITY';

/**
 * 1. Entity Record (Mandatory fields as specified):
 * - entity name
 * - entity type
 * - known addresses
 * - chain
 * - confidence
 * - source
 * - last verified date
 */
export interface EntityRecord {
  /** Entity Name (e.g. "Binance Global", "Coinbase Inc.", "Kraken", "Tornado Cash") */
  entityName: string;

  /** Entity Type (VASP, Centralized Exchange, DEX, Mixer, Bridge, etc.) */
  entityType: AttributionEntityType;

  /** Known verified addresses associated with this entity cluster */
  knownAddresses: string[];

  /** Primary blockchain or Multi-Chain classification */
  chain: AttributionChain;

  /** Base confidence score of the entity record (0 to 100) */
  confidence: number;

  /** Source of intelligence verification (e.g. "OFAC SDN", "LEA 2703(f)", "Public Sweeper", "Etherscan Official") */
  source: string;

  /** Last verified date in ISO 8601 string format (e.g. "2026-08-15T09:30:00Z") */
  lastVerifiedDate: string;

  /** Optional extended intelligence metadata */
  metadata?: {
    entityId?: string;
    jurisdiction?: string;
    kycComplianceTier?: string;
    subpoenaPortal?: string;
    leaTurnaroundHours?: number;
    estimatedClusterAddresses?: number;
    tags?: string[];
  };
}

/**
 * 2. Supporting Evidence Item
 * Detailed signal breakdown backing the probable attribution.
 */
export interface SupportingEvidence {
  /** Heuristic category */
  heuristic: AttributionHeuristicType;

  /** Signal title (e.g. "Direct Deposit Sweep", "Co-Spending Cluster Heuristic") */
  signalTitle: string;

  /** Wording qualifier: "Probable VASP", "Likely associated", etc. */
  qualification: string;

  /** Descriptive forensic evidence rationale */
  description: string;

  /** Confidence contribution score (0 to 100) */
  confidenceScore: number;

  /** Related transaction hash if applicable */
  txHash?: string;

  /** Block number if applicable */
  blockNumber?: number;

  /** Timestamp if applicable */
  timestamp?: number;

  /** Additional evidentiary attributes */
  details?: Record<string, any>;
}

/**
 * 3. Probable Attribution Query Context
 * Context provided when requesting address attribution.
 */
export interface AttributionContext {
  chain?: AttributionChain;
  transactions?: Array<{
    txHash: string;
    fromAddress: string;
    toAddress: string;
    amount: string | number;
    asset: string;
    timestamp: number;
    blockNumber: number;
    isSwept?: boolean;
    gasUsed?: number;
  }>;
  coSpentAddresses?: string[];
  clusterId?: string;
  graphNeighbors?: Array<{
    neighborAddress: string;
    hops: number;
    volumeUsd: number;
    direction: 'incoming' | 'outgoing';
  }>;
}

/**
 * 4. Returned Probable Attribution Result
 * Must return:
 * - entity: EntityRecord | null
 * - attribution confidence: number (e.g. 98.5%)
 * - supporting evidence: SupportingEvidence[]
 * 
 * Strict compliance with non-confirmed ownership disclaimer.
 */
export interface ProbableAttributionResult {
  /** Subject address being evaluated */
  targetAddress: string;

  /** Target blockchain */
  chain: AttributionChain;

  /** Attributed Entity Record (or null if unattributed) */
  entity: EntityRecord | null;

  /** Attribution confidence score (0 to 100 percentage) */
  attributionConfidence: number;

  /** Probabilistic verdict: "Probable VASP" | "Likely associated" | "Unattributed / Unknown" */
  attributionVerdict: AttributionVerdict;

  /** Multivariate supporting evidence items backing the confidence */
  supportingEvidence: SupportingEvidence[];

  /** Timestamp of algorithmic attribution execution */
  evaluatedAt: string;

  /** Legal evidentiary standard disclaimer */
  legalDisclaimer: string;
}
