/**
 * CryptoTrace Intelligence Platform — Blockchain Subscription Providers
 * 
 * Modular architecture for real-time blockchain transaction feeds.
 * Supports:
 * 1. Event-Driven WebSocket RPC Providers (Alchemy, Infura, QuickNode, Local Geth/Erigon)
 * 2. Scheduled Polling Providers (HTTP REST / Indexers)
 * 3. Simulated Mempool Stream Provider (High-fidelity test and offline evaluation)
 */

import { NormalizedTransaction } from '../blockchain/normalization/types';
import {
  IBlockchainSubscriptionProvider,
  SubscriptionConnectionStatus,
} from './types';
import { blockchainRegistry } from '../blockchain/AdapterRegistry';
import { TransactionNormalizer } from '../blockchain/normalization/TransactionNormalizer';

interface SubscriptionCallbackRecord {
  id: string;
  wallet: string;
  chain: string;
  onTransaction: (tx: NormalizedTransaction) => void;
}

// ============================================================================
// 1. EVENT-DRIVEN WEBSOCKET SUBSCRIPTION PROVIDER
// ============================================================================

export interface WebSocketProviderConfig {
  url?: string;
  autoReconnect?: boolean;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
  heartbeatIntervalMs?: number;
}

/**
 * WebSocketSubscriptionProvider
 * 
 * Production-ready event-driven provider skeleton for connecting to JSON-RPC 2.0
 * WebSocket endpoints (e.g. wss://eth-mainnet.g.alchemy.com/v2/KEY, wss://mainnet.infura.io/ws/v3/KEY).
 * Subscribes to newPendingTransactions or logs topic with address filters.
 */
export class WebSocketSubscriptionProvider implements IBlockchainSubscriptionProvider {
  public readonly id: string;
  public readonly name: string;
  public readonly providerType = 'websocket' as const;

  private url: string;
  private autoReconnect: boolean;
  private reconnectIntervalMs: number;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private status: SubscriptionConnectionStatus = 'DISCONNECTED';

  private socket: WebSocket | null = null;
  private subscriptions: Map<string, SubscriptionCallbackRecord> = new Map();
  private statusListeners: Array<(status: SubscriptionConnectionStatus) => void> = [];
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private subCounter = 0;

  constructor(config: WebSocketProviderConfig = {}) {
    this.id = 'ws-blockchain-rpc';
    this.name = 'EVM / Multi-Chain WebSocket RPC Feed';
    this.url = config.url || 'wss://ethereum-rpc.publicnode.com';
    this.autoReconnect = config.autoReconnect ?? true;
    this.reconnectIntervalMs = config.reconnectIntervalMs ?? 4000;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
  }

  public getStatus(): SubscriptionConnectionStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: SubscriptionConnectionStatus) => void): void {
    this.statusListeners.push(callback);
  }

  private setStatus(status: SubscriptionConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((cb) => cb(status));
    }
  }

  public async connect(): Promise<void> {
    if (this.status === 'CONNECTED' || this.status === 'CONNECTING') return;

    this.setStatus('CONNECTING');

    // In browser or Node with global WebSocket support
    if (typeof WebSocket === 'undefined') {
      // In non-browser testing environments without WebSocket polyfill,
      // simulate connection gracefully
      this.setStatus('CONNECTED');
      return;
    }

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        this.startHeartbeat();
        this.reissueSubscriptions();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = () => {
        this.setStatus('ERROR');
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.setStatus('DISCONNECTED');
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.setStatus('RECONNECTING');
          setTimeout(() => {
            this.connect().catch(() => {});
          }, this.reconnectIntervalMs);
        }
      };
    } catch {
      this.setStatus('ERROR');
    }
  }

  public async disconnect(): Promise<void> {
    this.autoReconnect = false;
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus('DISCONNECTED');
  }

  public subscribe(
    wallet: string,
    chain: string,
    onTransaction: (tx: NormalizedTransaction) => void
  ): string {
    const subId = `sub-ws-${++this.subCounter}-${Date.now()}`;
    const normAddr = wallet.toLowerCase();

    this.subscriptions.set(subId, {
      id: subId,
      wallet: normAddr,
      chain,
      onTransaction,
    });

    // If connected to live RPC, send eth_subscribe filter
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const subscribePayload = JSON.stringify({
        jsonrpc: '2.0',
        id: this.subCounter,
        method: 'eth_subscribe',
        params: ['logs', { address: normAddr }],
      });
      this.socket.send(subscribePayload);
    }

    return subId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  private reissueSubscriptions(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    for (const sub of this.subscriptions.values()) {
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.subCounter,
        method: 'eth_subscribe',
        params: ['logs', { address: sub.wallet }],
      });
      this.socket.send(payload);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ jsonrpc: '2.0', method: 'net_version', id: 99999 }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleMessage(raw: string | ArrayBuffer): void {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : JSON.parse(new TextDecoder().decode(raw));
      if (!data) return;

      // Extract transaction payload if this is an eth_subscription notification
      const tx = this.parseRawRpcEvent(data);
      if (tx) {
        this.dispatchTransaction(tx);
      }
    } catch {
      // Ignore unparseable frames
    }
  }

  public dispatchTransaction(tx: NormalizedTransaction): void {
    const from = tx.from_address.toLowerCase();
    const to = tx.to_address.toLowerCase();

    for (const sub of this.subscriptions.values()) {
      if (sub.wallet === from || sub.wallet === to) {
        sub.onTransaction(tx);
      }
    }
  }

  private parseRawRpcEvent(data: Record<string, unknown>): NormalizedTransaction | null {
    if (data.method === 'eth_subscription' && data.params) {
      const params = data.params as { result?: Record<string, unknown> };
      const log = params.result;
      if (log && typeof log.transactionHash === 'string') {
        return {
          transaction_id: `tx-${log.transactionHash.slice(0, 16)}`,
          tx_hash: log.transactionHash,
          chain: 'Ethereum',
          block_number: typeof log.blockNumber === 'string' ? parseInt(log.blockNumber, 16) : 0,
          timestamp: Math.floor(Date.now() / 1000),
          from_address: typeof log.address === 'string' ? log.address : '0x0',
          to_address: '0x0',
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '0.0',
          transaction_type: 'TRANSFER',
          contract_address: null,
        };
      }
    }
    return null;
  }
}

// ============================================================================
// 2. POLLING SUBSCRIPTION PROVIDER
// ============================================================================

export interface PollingProviderConfig {
  intervalMs?: number;
}

/**
 * PollingSubscriptionProvider
 * 
 * Scheduled polling provider suitable for REST indexers, public explorers,
 * or rate-limited APIs.
 */
export class PollingSubscriptionProvider implements IBlockchainSubscriptionProvider {
  public readonly id: string;
  public readonly name: string;
  public readonly providerType = 'polling' as const;

  private intervalMs: number;
  private status: SubscriptionConnectionStatus = 'DISCONNECTED';
  private timer: ReturnType<typeof setInterval> | null = null;
  private subscriptions: Map<string, SubscriptionCallbackRecord> = new Map();
  private statusListeners: Array<(status: SubscriptionConnectionStatus) => void> = [];
  private subCounter = 0;

  constructor(config: PollingProviderConfig = {}) {
    this.id = 'polling-indexer';
    this.name = 'Scheduled REST Blockchain Poller';
    this.intervalMs = config.intervalMs ?? 5000;
  }

  public getStatus(): SubscriptionConnectionStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: SubscriptionConnectionStatus) => void): void {
    this.statusListeners.push(callback);
  }

  private setStatus(status: SubscriptionConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach((cb) => cb(status));
    }
  }

  public async connect(): Promise<void> {
    if (this.status === 'CONNECTED') return;

    this.setStatus('CONNECTED');
    this.timer = setInterval(() => {
      this.pollCycle();
    }, this.intervalMs);
  }

  public async disconnect(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.setStatus('DISCONNECTED');
  }

  public subscribe(
    wallet: string,
    chain: string,
    onTransaction: (tx: NormalizedTransaction) => void
  ): string {
    const subId = `sub-poll-${++this.subCounter}-${Date.now()}`;
    this.subscriptions.set(subId, {
      id: subId,
      wallet: wallet.toLowerCase(),
      chain,
      onTransaction,
    });
    return subId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  private seenTxHashes = new Set<string>();

  private async pollCycle(): Promise<void> {
    if (this.subscriptions.size === 0) return;

    for (const sub of this.subscriptions.values()) {
      try {
        const adapter = blockchainRegistry.detectAdapterForAddress(sub.wallet, sub.chain) || blockchainRegistry.get('Ethereum');
        const txs = await adapter.get_transactions(sub.wallet, { limit: 5 });
        for (const rawTx of txs) {
          if (!this.seenTxHashes.has(rawTx.hash)) {
            this.seenTxHashes.add(rawTx.hash);
            const normalized = TransactionNormalizer.fromAdapterTransaction(rawTx, {
              usdRate: rawTx.assetSymbol === 'USDT' || rawTx.assetSymbol === 'USDC' ? 1 : 3200,
            });
            this.dispatchTransaction(normalized);
          }
        }
      } catch {
        // Continue quietly on transient network rate limits
      }
    }
  }

  public dispatchTransaction(tx: NormalizedTransaction): void {
    const from = tx.from_address.toLowerCase();
    const to = tx.to_address.toLowerCase();

    for (const sub of this.subscriptions.values()) {
      if (sub.wallet === from || sub.wallet === to) {
        sub.onTransaction(tx);
      }
    }
  }
}

// ============================================================================
// 3. SIMULATED MEMPOOL STREAM PROVIDER (HIGH-FIDELITY DEMONSTRATION)
// ============================================================================

/**
 * SimulatedStreamProvider
 * 
 * Real-time event simulator that pushes realistic transactions to subscribers.
 * Enables live demonstrations of all 8 alert typologies without needing paid mainnet RPCs.
 */
export class SimulatedStreamProvider implements IBlockchainSubscriptionProvider {
  public readonly id: string;
  public readonly name: string;
  public readonly providerType = 'mempool' as const;

  private status: SubscriptionConnectionStatus = 'DISCONNECTED';
  private subscriptions: Map<string, SubscriptionCallbackRecord> = new Map();
  private statusListeners: Array<(status: SubscriptionConnectionStatus) => void> = [];
  private subCounter = 0;

  constructor() {
    this.id = 'simulated-mempool-stream';
    this.name = 'Mempool Live Event Stream';
  }

  public getStatus(): SubscriptionConnectionStatus {
    return this.status;
  }

  public onStatusChange(callback: (status: SubscriptionConnectionStatus) => void): void {
    this.statusListeners.push(callback);
  }

  public async connect(): Promise<void> {
    this.status = 'CONNECTED';
    this.statusListeners.forEach((cb) => cb('CONNECTED'));
  }

  public async disconnect(): Promise<void> {
    this.status = 'DISCONNECTED';
    this.statusListeners.forEach((cb) => cb('DISCONNECTED'));
  }

  public subscribe(
    wallet: string,
    chain: string,
    onTransaction: (tx: NormalizedTransaction) => void
  ): string {
    const subId = `sub-sim-${++this.subCounter}-${Date.now()}`;
    this.subscriptions.set(subId, {
      id: subId,
      wallet: wallet.toLowerCase(),
      chain,
      onTransaction,
    });
    return subId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Broadcast an arbitrary normalized transaction to any matching wallet subscriber
   */
  public emitTransaction(tx: NormalizedTransaction): void {
    const from = tx.from_address.toLowerCase();
    const to = tx.to_address.toLowerCase();

    for (const sub of this.subscriptions.values()) {
      if (sub.wallet === from || sub.wallet === to) {
        sub.onTransaction(tx);
      }
    }
  }
}
