/**
 * CryptoTrace Intelligence — Transaction Normalization Types
 * 
 * Clean, provider-agnostic internal representation for blockchain transfers.
 * Standardizes raw RPC payloads, indexer transactions, and event logs
 * from Ethereum, Bitcoin, Solana, TRON, Avalanche, and future chains.
 */

export type AssetType = 
  | 'NATIVE'
  | 'TOKEN_ERC20'
  | 'TOKEN_TRC20'
  | 'TOKEN_SPL'
  | 'TOKEN_ARC20'
  | 'TOKEN_BEP20'
  | 'RUNES'
  | 'ORDINAL'
  | 'UNKNOWN';

export type TransactionType = 
  | 'TRANSFER'
  | 'TOKEN_TRANSFER'
  | 'CONTRACT_EXECUTION'
  | 'CONTRACT_DEPLOYMENT'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'SWAP'
  | 'MINT'
  | 'BURN'
  | 'FEE';

/**
 * NormalizedTransaction
 * 
 * Strict internal representation of a blockchain transfer or transaction event,
 * entirely independent of blockchain provider or network transport.
 */
export interface NormalizedTransaction {
  /** Deterministic, unique identifier for forensic graph indexing */
  transaction_id: string;

  /** On-chain transaction hash, signature, or txid */
  tx_hash: string;

  /** Canonical blockchain name (e.g. 'Ethereum', 'Bitcoin', 'Solana', 'Tron', 'Avalanche') */
  chain: string;

  /** Block height or slot number */
  block_number: number;

  /** Unix epoch timestamp in seconds */
  timestamp: number;

  /** Normalized sender address */
  from_address: string;

  /** Normalized recipient address */
  to_address: string;

  /** Asset ticker symbol (e.g. 'ETH', 'BTC', 'SOL', 'USDT', 'USDC', 'TRX', 'AVAX') */
  asset: string;

  /** Classification of the underlying asset mechanism */
  asset_type: AssetType;

  /** Formatted, high-precision decimal quantity string (avoids float precision loss) */
  amount: string;

  /** Forensic transaction action classification */
  transaction_type: TransactionType;

  /** Smart contract address for tokens, or null for native coins */
  contract_address: string | null;

  // Forensic Enrichment Metadata
  date_time?: string; // ISO 8601 UTC timestamp
  amount_usd?: number | null;
  fee?: string | null;
  fee_usd?: number | null;
  status?: 'confirmed' | 'pending' | 'failed';
  log_index?: number | null;
  metadata?: Record<string, unknown>;
}

export interface NormalizationOptions {
  usdRate?: number;
  feeUsdRate?: number;
  customAssetType?: AssetType;
  customTxType?: TransactionType;
}
