/**
 * CryptoTrace Intelligence Platform — Real-Time Surveillance & Watchlist Types
 * 
 * Defines schemas for:
 * - Monitored Wallets (wallet, case, status, last_checked, last_transaction)
 * - 8 Alert Typologies (NEW_TRANSACTION, HIGH_VALUE_TRANSFER, RAPID_FORWARDING, etc.)
 * - Event-Driven Blockchain Subscription Provider Interfaces
 */

import { NormalizedTransaction } from '../blockchain/normalization/types';

export type WatchlistStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * 8 Required Alert Typologies
 */
export type MonitoringAlertType =
  | 'NEW_TRANSACTION'
  | 'HIGH_VALUE_TRANSFER'
  | 'RAPID_FORWARDING'
  | 'LAYERING_DETECTED'
  | 'CROSS_CHAIN_ACTIVITY'
  | 'HIGH_RISK_ENTITY'
  | 'MIXER_EXPOSURE'
  | 'EXCHANGE_DEPOSIT';

/**
 * Summary representation of the last observed on-chain transaction
 */
export interface MonitoredTransactionSummary {
  tx_hash: string;
  timestamp: string; // ISO 8601 or formatted
  block_number: number;
  from_address: string;
  to_address: string;
  amount: string;
  asset: string;
  direction: 'INCOMING' | 'OUTGOING';
  amount_usd?: number;
}

/**
 * Monitored Wallet
 * Explicitly includes the 5 mandated fields:
 * - wallet
 * - case
 * - status
 * - last_checked
 * - last_transaction
 */
export interface MonitoredWallet {
  /** Target wallet address (Hex or base58) */
  wallet: string;

  /** Associated law enforcement case identifier (e.g. "INV-2023-0842") */
  case: string;

  /** Surveillance status: ACTIVE, PAUSED, ARCHIVED */
  status: WatchlistStatus;

  /** Timestamp of last surveillance cycle or block poll (ISO 8601) */
  last_checked: string;

  /** Details of the most recent on-chain transaction observed, or null if fresh */
  last_transaction: MonitoredTransactionSummary | null;

  // Metadata extensions for rich operational context
  chain?: string;
  label?: string;
  notes?: string;
  risk_score?: number;
  alert_threshold_usd?: number;
  monitored_since?: string;
}

/**
 * Surveillance Alert Record generated when a transaction satisfies rule conditions
 */
export interface MonitoringAlert {
  id: string;
  alert_type: MonitoringAlertType;
  severity: AlertSeverity;
  wallet: string; // Monitored wallet address
  case: string; // Case reference
  tx_hash: string;
  chain: string;
  title: string;
  description: string;
  timestamp: string;
  is_read: boolean;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  metadata: {
    amount?: string;
    asset?: string;
    amount_usd?: number;
    counterparty?: string;
    counterparty_label?: string;
    entity_name?: string;
    entity_type?: string;
    time_delta_seconds?: number;
    hop_count?: number;
    bridge_name?: string;
    mixer_name?: string;
    exchange_name?: string;
    risk_score?: number;
    rule_reasoning?: string;
    [key: string]: unknown;
  };
}

/**
 * Connection status for event-driven blockchain subscription providers
 */
export type SubscriptionConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';

/**
 * Pluggable Event-Driven Subscription Provider Interface
 * Allows attaching WebSocket RPC nodes (Alchemy, QuickNode, Infura, local node),
 * mempool feeds, or webhook endpoints seamlessly.
 */
export interface IBlockchainSubscriptionProvider {
  /** Unique provider identifier */
  readonly id: string;

  /** Human-readable provider label (e.g. 'Ethereum WSS Mempool Feed') */
  readonly name: string;

  /** Provider transport type */
  readonly providerType: 'websocket' | 'polling' | 'webhook' | 'mempool';

  /** Initialize transport connection (e.g., open WebSocket, verify RPC endpoint) */
  connect(): Promise<void>;

  /** Terminate transport connection */
  disconnect(): Promise<void>;

  /** Query current connection health */
  getStatus(): SubscriptionConnectionStatus;

  /**
   * Subscribe to transactions involving a specific address on a target chain.
   * Returns a unique subscription handle ID.
   */
  subscribe(
    wallet: string,
    chain: string,
    onTransaction: (tx: NormalizedTransaction) => void
  ): string;

  /**
   * Cancel an active subscription handle.
   */
  unsubscribe(subscriptionId: string): boolean;

  /**
   * Optional listener for connection status transitions
   */
  onStatusChange?(callback: (status: SubscriptionConnectionStatus) => void): void;
}
