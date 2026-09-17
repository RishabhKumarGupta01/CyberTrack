/**
 * CryptoTrace Intelligence — Unified Blockchain Adapter Types
 * 
 * Standardized data transfer objects (DTOs) agnostic to underlying chain mechanics.
 * Additional chains (Bitcoin, Solana, TRON) conform to these interfaces
 * without requiring alterations to downstream forensic analytics engines.
 */

export type SupportedChain = 
  | 'Ethereum' 
  | 'Bitcoin' 
  | 'Solana' 
  | 'BNB Chain' 
  | 'Polygon' 
  | 'Tron' 
  | 'Avalanche';

export interface PaginationOptions {
  limit?: number;
  page?: number;
  startBlock?: number;
  endBlock?: number;
  sort?: 'asc' | 'desc';
}

export interface TokenTransferOptions extends PaginationOptions {
  contractAddress?: string; // Filter to specific ERC-20 token contract (e.g. USDT)
}

export interface AdapterTransaction {
  hash: string;
  blockchain: SupportedChain | string;
  blockNumber: number;
  timestamp: number; // Unix epoch seconds
  dateTime: string; // ISO 8601 UTC string
  from: string;
  to: string;
  value: string; // Formatted human-readable amount (e.g. "120.5")
  valueRaw: string; // Atomic units (e.g. wei, satoshis)
  assetSymbol: string; // "ETH", "BTC", "SOL", etc.
  fee?: string; // Gas or miner fee in native asset
  status: 'confirmed' | 'pending' | 'failed';
  isContractInteraction?: boolean;
  gasUsed?: string;
  gasPrice?: string;
  nonce?: number;
}

export interface AdapterTokenTransfer {
  hash: string;
  blockchain: SupportedChain | string;
  blockNumber: number;
  timestamp: number;
  dateTime: string;
  from: string;
  to: string;
  contractAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  value: string; // Formatted decimal amount (e.g. "50000.00")
  valueRaw: string;
  logIndex?: number;
}

export interface TokenBalanceItem {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string; // Formatted
  balanceRaw: string;
}

export interface AdapterBalance {
  address: string;
  blockchain: SupportedChain | string;
  balance: string; // Formatted native asset balance (e.g. "142.85")
  balanceRaw: string; // Wei / Satoshi atomic amount
  assetSymbol: string;
  tokenBalances?: TokenBalanceItem[];
  updatedAt: string;
}

export interface AdapterNetworkInfo {
  blockchain: SupportedChain | string;
  nativeAsset: string;
  currentBlockNumber: number;
  chainId?: number | string;
  isSynced: boolean;
}
