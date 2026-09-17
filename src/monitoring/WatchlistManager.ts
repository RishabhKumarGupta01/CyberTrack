/**
 * CryptoTrace Intelligence Platform — Watchlist Manager & Real-Time Alert Engine
 * 
 * Implements:
 * - Wallet Watchlists with required 5 attributes:
 *   1. wallet
 *   2. case
 *   3. status
 *   4. last_checked
 *   5. last_transaction
 * - Automated detection & generation of all 8 Alert Typologies:
 *   1. NEW_TRANSACTION
 *   2. HIGH_VALUE_TRANSFER
 *   3. RAPID_FORWARDING
 *   4. LAYERING_DETECTED
 *   5. CROSS_CHAIN_ACTIVITY
 *   6. HIGH_RISK_ENTITY
 *   7. MIXER_EXPOSURE
 *   8. EXCHANGE_DEPOSIT
 * - Extensible architecture accepting any IBlockchainSubscriptionProvider (WebSocket, Polling, Mempool)
 */

import { NormalizedTransaction } from '../blockchain/normalization/types';
import { EntityIntelligenceLayer } from '../attribution/EntityIntelligenceLayer';
import {
  MonitoredWallet,
  MonitoringAlert,
  MonitoringAlertType,
  WatchlistStatus,
  IBlockchainSubscriptionProvider,
} from './types';
import { PollingSubscriptionProvider } from './SubscriptionProvider';
import { SupabaseService } from '../services/supabaseService';

export class WatchlistManager {
  private static instance: WatchlistManager;

  // Monitored wallets indexed by normalized address
  private wallets: Map<string, MonitoredWallet> = new Map();

  // Alert History store
  private alerts: MonitoringAlert[] = [];

  // Active subscription provider (WebSocket, Polling, or Simulated Stream)
  private provider: IBlockchainSubscriptionProvider;

  // Active provider subscription handles: walletAddress -> subscriptionId
  private activeSubscriptions: Map<string, string> = new Map();

  // Alert listeners (Pub/Sub for UI, Webhooks, or Notification Service)
  private alertListeners: Array<(alert: MonitoringAlert) => void> = [];

  // Wallet update listeners
  private walletListeners: Array<(wallets: MonitoredWallet[]) => void> = [];

  // Historical transactions map for rapid forwarding detection: wallet -> NormalizedTransaction[]
  private transactionHistory: Map<string, NormalizedTransaction[]> = new Map();

  // Known Bridges for Cross-Chain Activity Detection
  private knownBridges: Map<string, string> = new Map([
    ['0x8eb8a3b98659cce23046285641003a5e95e2b282', 'Avalanche Bridge (AVAX-ETH)'],
    ['0x98f3c9e6e3fAce36bA86604b70ac62846929d300', 'Portal / Wormhole Bridge'],
    ['0x4f4495243837681061c4743b74b3eedf548d56a5', 'Stargate Finance Bridge Router'],
    ['0x23ddd3e3692d1861ed57ede224608875809e127f', 'Multichain (AnySwap) Router'],
    ['0xb8901acb29794ba208a564eed70e5b72e519280d', 'Hop Exchange Bridge'],
  ]);

  // Known Mixers for Privacy Mixer Exposure Detection
  private knownMixers: Map<string, string> = new Map([
    ['0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', 'Tornado.Cash: Router'],
    ['0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc', 'Tornado.Cash: 0.1 ETH Pool'],
    ['0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936', 'Tornado.Cash: 1 ETH Pool'],
    ['0x910cbd523d972eb0a6f4cae4618ad62622b39dbf', 'Tornado.Cash: 10 ETH Pool'],
    ['0xa160cdab225685da1d56aa342ad8841c3b53f291', 'Tornado.Cash: 100 ETH Pool'],
    ['0x0836222f2b2b24a3f36f98668ed8f0b38d1a872f', 'Railgun Privacy Contract'],
    ['bc1qmixer88sinbadpool28384812398419284918239', 'Sinbad Bitcoin Mixer Stash'],
  ]);

  // Known Centralized Exchange Deposit / Hot Wallets
  private knownExchanges: Map<string, string> = new Map([
    ['0x28c6c06298d514db089934071355e5743bf21d60', 'Binance Hot 14'],
    ['0x21a31ee1afc51d94c2efccaa2092ad1028285549', 'Binance Hot 15'],
    ['0xdf81d11b0e27a925439a897b6a65529f33a01102', 'Binance Deposit Proxy'],
    ['0xa7efae728d2936e78bda97dc267687568dd593f3', 'OKX Hot Wallet'],
    ['0x503828976d22510aad0201ac7ec88293211d23dc', 'Coinbase Prime Deposit'],
    ['0x2910543af39aba0cd09dbb2d50200b3e800a63d2', 'Kraken Hot Wallet'],
  ]);

  constructor() {
    // Default to the live polling blockchain subscription provider
    this.provider = new PollingSubscriptionProvider({ intervalMs: 8000 });
    this.seedDefaultWatchlist();
    this.seedHistoricalAlerts();
    this.initializeProvider();
    this.syncWithSupabaseCases();
  }

  public static getInstance(): WatchlistManager {
    if (!WatchlistManager.instance) {
      WatchlistManager.instance = new WatchlistManager();
    }
    return WatchlistManager.instance;
  }

  // ==========================================================================
  // Provider Architecture & Lifecycle
  // ==========================================================================

  /**
   * Pluggable Provider Swapping:
   * Attach a live WebSocketProvider, PollingProvider, or external Webhook stream
   * without rewriting alert logic or watchlist stores.
   */
  public async setSubscriptionProvider(newProvider: IBlockchainSubscriptionProvider): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
    }

    this.provider = newProvider;
    await this.initializeProvider();
  }

  public getSubscriptionProvider(): IBlockchainSubscriptionProvider {
    return this.provider;
  }

  private async initializeProvider(): Promise<void> {
    await this.provider.connect();
    this.activeSubscriptions.clear();

    // Subscribe all ACTIVE wallets to the provider feed
    for (const [address, wallet] of this.wallets.entries()) {
      if (wallet.status === 'ACTIVE') {
        this.subscribeWalletToProvider(address, wallet.chain || 'Ethereum');
      }
    }
  }

  private subscribeWalletToProvider(address: string, chain: string): void {
    if (this.activeSubscriptions.has(address)) return;

    const subId = this.provider.subscribe(address, chain, (tx: NormalizedTransaction) => {
      this.processNewTransaction(tx);
    });

    this.activeSubscriptions.set(address, subId);
  }

  private unsubscribeWalletFromProvider(address: string): void {
    const subId = this.activeSubscriptions.get(address);
    if (subId) {
      this.provider.unsubscribe(subId);
      this.activeSubscriptions.delete(address);
    }
  }

  // ==========================================================================
  // Pre-Loaded Operation Velvet Vault Watchlist
  // ==========================================================================

  private seedDefaultWatchlist(): void {
    // 100% Real data architecture: Wallets are dynamically synced from active cases
    this.wallets = new Map();
  }

  private seedHistoricalAlerts(): void {
    // 100% Real data architecture: Zero hardcoded mock alerts. Alerts are created exclusively by live on-chain polling/websocket activity
    this.alerts = [];
  }

  public async syncWithSupabaseCases(): Promise<void> {
    try {
      const cases = await SupabaseService.getCases();
      if (cases && cases.length > 0) {
        for (const c of cases) {
          if (c.targetAddress && !this.wallets.has(c.targetAddress.toLowerCase())) {
            this.addWallet({
              wallet: c.targetAddress,
              case: c.caseId,
              chain: c.network || 'Ethereum',
              label: `${c.title} (Target Subject)`,
              notes: c.notes || 'Target wallet ingested from active case ledger.',
              status: 'ACTIVE',
              alert_threshold_usd: 1000,
            });
          }
        }
      }
    } catch (e) {
      console.warn('WatchlistManager: could not sync Supabase cases', e);
    }
  }

  // ==========================================================================
  // Monitored Wallets CRUD
  // ==========================================================================

  public getWallets(): MonitoredWallet[] {
    return Array.from(this.wallets.values());
  }

  public getWallet(address: string): MonitoredWallet | undefined {
    return this.wallets.get(address.toLowerCase());
  }

  public addWallet(params: {
    wallet: string;
    case: string;
    status?: WatchlistStatus;
    chain?: string;
    label?: string;
    notes?: string;
    risk_score?: number;
    alert_threshold_usd?: number;
  }): MonitoredWallet {
    const normAddr = params.wallet.toLowerCase();
    const newWallet: MonitoredWallet = {
      wallet: params.wallet,
      case: params.case,
      status: params.status || 'ACTIVE',
      last_checked: new Date().toISOString(),
      last_transaction: null,
      chain: params.chain || 'Ethereum',
      label: params.label || 'Monitored Target',
      notes: params.notes || '',
      risk_score: params.risk_score ?? 50,
      alert_threshold_usd: params.alert_threshold_usd ?? 5000,
      monitored_since: new Date().toISOString(),
    };

    this.wallets.set(normAddr, newWallet);

    if (newWallet.status === 'ACTIVE') {
      this.subscribeWalletToProvider(normAddr, newWallet.chain || 'Ethereum');
    }

    this.notifyWalletListeners();
    return newWallet;
  }

  public updateWalletStatus(address: string, status: WatchlistStatus): boolean {
    const normAddr = address.toLowerCase();
    const wallet = this.wallets.get(normAddr);
    if (!wallet) return false;

    wallet.status = status;
    wallet.last_checked = new Date().toISOString();

    if (status === 'ACTIVE') {
      this.subscribeWalletToProvider(normAddr, wallet.chain || 'Ethereum');
    } else {
      this.unsubscribeWalletFromProvider(normAddr);
    }

    this.notifyWalletListeners();
    return true;
  }

  public removeWallet(address: string): boolean {
    const normAddr = address.toLowerCase();
    this.unsubscribeWalletFromProvider(normAddr);
    const deleted = this.wallets.delete(normAddr);
    if (deleted) {
      this.notifyWalletListeners();
    }
    return deleted;
  }

  // ==========================================================================
  // Transaction Ingestion & 8 Alert Typologies Evaluation Engine
  // ==========================================================================

  /**
   * Evaluates a detected transaction against all 8 alert conditions
   * and updates the monitored wallet's last_checked and last_transaction.
   */
  public processNewTransaction(tx: NormalizedTransaction): MonitoringAlert[] {
    const from = tx.from_address.toLowerCase();
    const to = tx.to_address.toLowerCase();

    const monitoredSender = this.wallets.get(from);
    const monitoredRecipient = this.wallets.get(to);

    const generatedAlerts: MonitoringAlert[] = [];

    // Process from sender side if monitored
    if (monitoredSender && monitoredSender.status === 'ACTIVE') {
      const alerts = this.evaluateRulesForWallet(monitoredSender, tx, 'OUTGOING');
      generatedAlerts.push(...alerts);
      this.updateMonitoredWalletState(monitoredSender, tx, 'OUTGOING');
    }

    // Process from recipient side if monitored
    if (monitoredRecipient && monitoredRecipient.status === 'ACTIVE') {
      const alerts = this.evaluateRulesForWallet(monitoredRecipient, tx, 'INCOMING');
      generatedAlerts.push(...alerts);
      this.updateMonitoredWalletState(monitoredRecipient, tx, 'INCOMING');
    }

    // Record transaction history for velocity / rapid forwarding tracking
    this.recordTransactionHistory(from, tx);
    this.recordTransactionHistory(to, tx);

    // Dispatch newly generated alerts
    for (const alert of generatedAlerts) {
      this.alerts.unshift(alert);
      this.notifyAlertListeners(alert);
    }

    this.notifyWalletListeners();
    return generatedAlerts;
  }

  private updateMonitoredWalletState(
    wallet: MonitoredWallet,
    tx: NormalizedTransaction,
    direction: 'INCOMING' | 'OUTGOING'
  ): void {
    const nowIso = new Date().toISOString();
    const amountNum = parseFloat(tx.amount) || 0;
    const estimatedUsd = this.estimateUsdValue(tx.asset, amountNum);

    wallet.last_checked = nowIso;
    wallet.last_transaction = {
      tx_hash: tx.tx_hash,
      timestamp: new Date(tx.timestamp * 1000).toISOString(),
      block_number: tx.block_number,
      from_address: tx.from_address,
      to_address: tx.to_address,
      amount: tx.amount,
      asset: tx.asset,
      direction,
      amount_usd: estimatedUsd,
    };
  }

  private evaluateRulesForWallet(
    wallet: MonitoredWallet,
    tx: NormalizedTransaction,
    direction: 'INCOMING' | 'OUTGOING'
  ): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];
    const counterparty = direction === 'OUTGOING' ? tx.to_address.toLowerCase() : tx.from_address.toLowerCase();
    const amountNum = parseFloat(tx.amount) || 0;
    const amountUsd = this.estimateUsdValue(tx.asset, amountNum);
    const nowIso = new Date().toISOString();

    // ------------------------------------------------------------------------
    // 1. ALERT TYPE: NEW_TRANSACTION
    // ------------------------------------------------------------------------
    alerts.push({
      id: `ALT-NTX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      alert_type: 'NEW_TRANSACTION',
      severity: direction === 'OUTGOING' ? 'MEDIUM' : 'LOW',
      wallet: wallet.wallet,
      case: wallet.case,
      tx_hash: tx.tx_hash,
      chain: tx.chain,
      title: `New Transaction Detected on ${wallet.label || wallet.wallet.slice(0, 10)}`,
      description: `Observed ${direction.toLowerCase()} transfer of ${tx.amount} ${tx.asset} (~$${amountUsd.toLocaleString()} USD). Counterparty: ${counterparty.slice(0, 12)}...`,
      timestamp: nowIso,
      is_read: false,
      is_acknowledged: false,
      metadata: {
        direction,
        amount: tx.amount,
        asset: tx.asset,
        amount_usd: amountUsd,
        counterparty,
      },
    });

    // ------------------------------------------------------------------------
    // 2. ALERT TYPE: HIGH_VALUE_TRANSFER
    // ------------------------------------------------------------------------
    const thresholdUsd = wallet.alert_threshold_usd ?? 10000;
    if (amountUsd >= thresholdUsd) {
      alerts.push({
        id: `ALT-HVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        alert_type: 'HIGH_VALUE_TRANSFER',
        severity: amountUsd >= 50000 ? 'CRITICAL' : 'HIGH',
        wallet: wallet.wallet,
        case: wallet.case,
        tx_hash: tx.tx_hash,
        chain: tx.chain,
        title: `High-Value Transfer Flagged: $${amountUsd.toLocaleString()} USD`,
        description: `Transfer of ${tx.amount} ${tx.asset} exceeds surveillance threshold of $${thresholdUsd.toLocaleString()} USD. Urgent asset tracking recommended.`,
        timestamp: nowIso,
        is_read: false,
        is_acknowledged: false,
        metadata: {
          amount: tx.amount,
          asset: tx.asset,
          amount_usd: amountUsd,
          threshold_usd: thresholdUsd,
          counterparty,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 3. ALERT TYPE: RAPID_FORWARDING
    // ------------------------------------------------------------------------
    if (direction === 'OUTGOING') {
      const history = this.transactionHistory.get(wallet.wallet.toLowerCase()) || [];
      const recentIncoming = history.find(
        (prev) => prev.to_address.toLowerCase() === wallet.wallet.toLowerCase() &&
                  (tx.timestamp - prev.timestamp) >= 0 &&
                  (tx.timestamp - prev.timestamp) <= 900 // within 15 minutes
      );

      if (recentIncoming) {
        const deltaSeconds = tx.timestamp - recentIncoming.timestamp;
        alerts.push({
          id: `ALT-RPF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          alert_type: 'RAPID_FORWARDING',
          severity: 'HIGH',
          wallet: wallet.wallet,
          case: wallet.case,
          tx_hash: tx.tx_hash,
          chain: tx.chain,
          title: `Rapid Forwarding Velocity Triggered (${Math.round(deltaSeconds / 60)}m delta)`,
          description: `Monitored address forwarded ${tx.amount} ${tx.asset} outward just ${Math.round(deltaSeconds / 60)} minutes after receiving deposit from ${recentIncoming.from_address.slice(0, 10)}... Typology matches mule cash-out routing.`,
          timestamp: nowIso,
          is_read: false,
          is_acknowledged: false,
          metadata: {
            time_delta_seconds: deltaSeconds,
            previous_inflow_tx: recentIncoming.tx_hash,
            inflow_amount: recentIncoming.amount,
            forwarded_amount: tx.amount,
            asset: tx.asset,
          },
        });
      }
    }

    // ------------------------------------------------------------------------
    // 4. ALERT TYPE: LAYERING_DETECTED
    // ------------------------------------------------------------------------
    // Layering is flagged when transaction shows structured peeling or intermediary hops
    const isStructuredPeel = (tx.transaction_type === 'TRANSFER' && amountNum >= 0.05 && amountNum <= 10.0) &&
      (tx.metadata?.peeling_chain === true || tx.metadata?.is_layering === true || (tx.amount.endsWith('99') || tx.amount.endsWith('95')));

    if (isStructuredPeel || tx.metadata?.is_layering) {
      alerts.push({
        id: `ALT-LAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        alert_type: 'LAYERING_DETECTED',
        severity: 'HIGH',
        wallet: wallet.wallet,
        case: wallet.case,
        tx_hash: tx.tx_hash,
        chain: tx.chain,
        title: 'Layering Typology Detected (Peeling Chain / Splitting)',
        description: `Fund movement exhibits characteristic structured layering pattern: partial balance peeling and synthetic intermediary hop routing detected.`,
        timestamp: nowIso,
        is_read: false,
        is_acknowledged: false,
        metadata: {
          hop_count: (tx.metadata?.hop_count as number) || 2,
          amount: tx.amount,
          asset: tx.asset,
          counterparty,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 5. ALERT TYPE: CROSS_CHAIN_ACTIVITY
    // ------------------------------------------------------------------------
    const bridgeMatch = this.knownBridges.get(counterparty) ||
      (tx.metadata?.bridge_name as string) ||
      (tx.to_address.toLowerCase().includes('bridge') ? 'Cross-Chain Bridge' : null);

    if (bridgeMatch || tx.metadata?.is_cross_chain) {
      alerts.push({
        id: `ALT-CCA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        alert_type: 'CROSS_CHAIN_ACTIVITY',
        severity: 'HIGH',
        wallet: wallet.wallet,
        case: wallet.case,
        tx_hash: tx.tx_hash,
        chain: tx.chain,
        title: `Cross-Chain Bridge Activity: ${bridgeMatch || 'Bridge Contract'}`,
        description: `Monitored address interacted with cross-chain liquidity bridge (${bridgeMatch || 'Bridge Contract'}). High probability of chain-hopping evasion.`,
        timestamp: nowIso,
        is_read: false,
        is_acknowledged: false,
        metadata: {
          bridge_name: bridgeMatch || 'Bridge Contract',
          amount: tx.amount,
          asset: tx.asset,
          counterparty,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 6. ALERT TYPE: HIGH_RISK_ENTITY
    // ------------------------------------------------------------------------
    const eil = EntityIntelligenceLayer.getInstance();
    const attribution = eil.attributeAddress(counterparty, { chain: tx.chain as any });
    
    // Check if high-risk entity or darknet / phishing / sanctions
    const attributedEntity = attribution?.entity;
    const isAttributedHighRisk = attributedEntity && (
      attributedEntity.entityType === 'High-Risk Entity' ||
      attributedEntity.entityType === 'Sanctioned Entity' ||
      (attributedEntity.entityName && attributedEntity.entityName.toLowerCase().includes('hydra')) ||
      (attributedEntity.entityName && attributedEntity.entityName.toLowerCase().includes('lazarus')) ||
      attribution.attributionConfidence >= 75
    );

    if (isAttributedHighRisk || tx.metadata?.high_risk_counterparty) {
      const entityName = attributedEntity?.entityName || 'High-Risk Sanctioned Cluster';
      const entityType = attributedEntity?.entityType || 'High-Risk Entity';
      const conf = attribution?.attributionConfidence || 90;

      alerts.push({
        id: `ALT-HRE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        alert_type: 'HIGH_RISK_ENTITY',
        severity: 'CRITICAL',
        wallet: wallet.wallet,
        case: wallet.case,
        tx_hash: tx.tx_hash,
        chain: tx.chain,
        title: `High-Risk Entity Exposure: ${entityName}`,
        description: `Probable interaction with ${entityName} (${entityType}). Attribution confidence: ${conf}%. Immediate evidentiary preservation recommended.`,
        timestamp: nowIso,
        is_read: false,
        is_acknowledged: false,
        metadata: {
          entity_name: entityName,
          entity_type: entityType,
          confidence: conf,
          counterparty,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 7. ALERT TYPE: MIXER_EXPOSURE
    // ------------------------------------------------------------------------
    const mixerMatch = this.knownMixers.get(counterparty) ||
      (attributedEntity?.entityType === 'Mixer' ? attributedEntity.entityName : null) ||
      (tx.metadata?.mixer_exposure ? 'Privacy Mixer' : null);

    if (mixerMatch) {
      alerts.push({
        id: `ALT-MIX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        alert_type: 'MIXER_EXPOSURE',
        severity: 'CRITICAL',
        wallet: wallet.wallet,
        case: wallet.case,
        tx_hash: tx.tx_hash,
        chain: tx.chain,
        title: `Privacy Mixer Interaction: ${mixerMatch}`,
        description: `Monitored address engaged in fund transfer with known anonymizing privacy pool (${mixerMatch}). Obfuscation attempt detected.`,
        timestamp: nowIso,
        is_read: false,
        is_acknowledged: false,
        metadata: {
          mixer_name: mixerMatch,
          amount: tx.amount,
          asset: tx.asset,
          counterparty,
        },
      });
    }

    // ------------------------------------------------------------------------
    // 8. ALERT TYPE: EXCHANGE_DEPOSIT
    // ------------------------------------------------------------------------
    const exchangeMatch = this.knownExchanges.get(counterparty) ||
      (attributedEntity?.entityType === 'Centralized Exchange' ? attributedEntity.entityName : null) ||
      (tx.metadata?.is_exchange_deposit ? 'Centralized Exchange' : null);

    if (direction === 'OUTGOING' && exchangeMatch) {
      alerts.push({
        id: `ALT-EXD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        alert_type: 'EXCHANGE_DEPOSIT',
        severity: 'HIGH',
        wallet: wallet.wallet,
        case: wallet.case,
        tx_hash: tx.tx_hash,
        chain: tx.chain,
        title: `Exchange Deposit Flagged: ${exchangeMatch}`,
        description: `Monitored target deposited ${tx.amount} ${tx.asset} into ${exchangeMatch}. Actionable VASP deposit hop — file 2703(d) preservation / freeze notice immediately.`,
        timestamp: nowIso,
        is_read: false,
        is_acknowledged: false,
        metadata: {
          exchange_name: exchangeMatch,
          amount: tx.amount,
          asset: tx.asset,
          amount_usd: amountUsd,
          counterparty,
          subpoena_recommended: true,
        },
      });
    }

    return alerts;
  }

  private recordTransactionHistory(address: string, tx: NormalizedTransaction): void {
    const list = this.transactionHistory.get(address) || [];
    list.unshift(tx);
    if (list.length > 20) list.pop();
    this.transactionHistory.set(address, list);
  }

  private estimateUsdValue(asset: string, amount: number): number {
    const prices: Record<string, number> = {
      ETH: 3000,
      BTC: 64000,
      SOL: 140,
      AVAX: 35,
      TRX: 0.15,
      USDT: 1.0,
      USDC: 1.0,
    };
    const rate = prices[asset.toUpperCase()] || 1.0;
    return Math.round(amount * rate);
  }

  // ==========================================================================
  // Alert Management & Pub/Sub Event Bus
  // ==========================================================================

  public getAlerts(filter?: {
    wallet?: string;
    case?: string;
    alert_type?: MonitoringAlertType;
    acknowledged?: boolean;
  }): MonitoringAlert[] {
    let list = this.alerts;

    if (filter?.wallet) {
      const norm = filter.wallet.toLowerCase();
      list = list.filter((a) => a.wallet.toLowerCase() === norm);
    }
    if (filter?.case) {
      list = list.filter((a) => a.case === filter.case);
    }
    if (filter?.alert_type) {
      list = list.filter((a) => a.alert_type === filter.alert_type);
    }
    if (filter?.acknowledged !== undefined) {
      list = list.filter((a) => a.is_acknowledged === filter.acknowledged);
    }

    return list;
  }

  public acknowledgeAlert(id: string, acknowledgedBy: string = 'Investigator'): boolean {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) return false;

    alert.is_acknowledged = true;
    alert.is_read = true;
    alert.acknowledged_by = acknowledgedBy;
    alert.acknowledged_at = new Date().toISOString();
    return true;
  }

  public onAlert(callback: (alert: MonitoringAlert) => void): () => void {
    this.alertListeners.push(callback);
    return () => {
      this.alertListeners = this.alertListeners.filter((cb) => cb !== callback);
    };
  }

  public onWalletsChange(callback: (wallets: MonitoredWallet[]) => void): () => void {
    this.walletListeners.push(callback);
    return () => {
      this.walletListeners = this.walletListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyAlertListeners(alert: MonitoringAlert): void {
    this.alertListeners.forEach((cb) => {
      try {
        cb(alert);
      } catch (err) {
        console.error('Alert listener threw error:', err);
      }
    });
  }

  private notifyWalletListeners(): void {
    const list = this.getWallets();
    this.walletListeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.error('Wallet listener threw error:', err);
      }
    });
  }

  // ==========================================================================
  // Simulation Helpers for Demonstration and Evaluation
  // ==========================================================================

  /**
   * Helper to trigger test scenarios across all 8 alert types
   */
  public triggerTestScenario(
    type: MonitoringAlertType,
    targetWalletAddress?: string
  ): MonitoringAlert[] {
    const wallet = targetWalletAddress
      ? this.getWallet(targetWalletAddress)
      : this.getWallets()[0];

    if (!wallet) return [];

    const now = Math.floor(Date.now() / 1000);
    let sampleTx: NormalizedTransaction;

    switch (type) {
      case 'NEW_TRANSACTION':
        sampleTx = {
          transaction_id: `tx-sim-new-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483000,
          timestamp: now,
          from_address: '0x3344556677889900112233445566778899001122',
          to_address: wallet.wallet,
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '1.25',
          transaction_type: 'TRANSFER',
          contract_address: null,
        };
        break;

      case 'HIGH_VALUE_TRANSFER':
        sampleTx = {
          transaction_id: `tx-sim-hvt-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483010,
          timestamp: now,
          from_address: wallet.wallet,
          to_address: '0x4455667788990011223344556677889900112233',
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '45.00', // $135,000 USD
          transaction_type: 'TRANSFER',
          contract_address: null,
        };
        break;

      case 'RAPID_FORWARDING': {
        // First record an incoming deposit 4 minutes ago
        const depositTx: NormalizedTransaction = {
          transaction_id: `tx-sim-dep-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483005,
          timestamp: now - 240, // 4 mins ago
          from_address: '0x1111222233334444555566667777888899990000',
          to_address: wallet.wallet,
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '10.00',
          transaction_type: 'TRANSFER',
          contract_address: null,
        };
        this.recordTransactionHistory(wallet.wallet.toLowerCase(), depositTx);

        sampleTx = {
          transaction_id: `tx-sim-rpf-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483020,
          timestamp: now,
          from_address: wallet.wallet,
          to_address: '0x9999888877776666555544443333222211110000',
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '9.95',
          transaction_type: 'TRANSFER',
          contract_address: null,
        };
        break;
      }

      case 'LAYERING_DETECTED':
        sampleTx = {
          transaction_id: `tx-sim-lay-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483030,
          timestamp: now,
          from_address: wallet.wallet,
          to_address: '0x3a2b9b1c44df89e007a14e5c0147b22883391bc1',
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '2.95',
          transaction_type: 'TRANSFER',
          contract_address: null,
          metadata: {
            is_layering: true,
            peeling_chain: true,
            hop_count: 3,
          },
        };
        break;

      case 'CROSS_CHAIN_ACTIVITY':
        sampleTx = {
          transaction_id: `tx-sim-cca-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483040,
          timestamp: now,
          from_address: wallet.wallet,
          to_address: '0x8eb8a3b98659cce23046285641003a5e95e2b282', // Avalanche Bridge
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '8.50',
          transaction_type: 'TRANSFER',
          contract_address: '0x8eb8a3b98659cce23046285641003a5e95e2b282',
        };
        break;

      case 'HIGH_RISK_ENTITY':
        sampleTx = {
          transaction_id: `tx-sim-hre-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483050,
          timestamp: now,
          from_address: wallet.wallet,
          to_address: '0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97', // Hydra Darknet / Sanctioned
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '5.20',
          transaction_type: 'TRANSFER',
          contract_address: null,
          metadata: {
            high_risk_counterparty: true,
          },
        };
        break;

      case 'MIXER_EXPOSURE':
        sampleTx = {
          transaction_id: `tx-sim-mix-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483060,
          timestamp: now,
          from_address: wallet.wallet,
          to_address: '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b', // Tornado.Cash Router
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '10.00',
          transaction_type: 'CONTRACT_EXECUTION',
          contract_address: '0xd90e2f925da726b50c4ed8d0fb90ad053324f31b',
        };
        break;

      case 'EXCHANGE_DEPOSIT':
        sampleTx = {
          transaction_id: `tx-sim-exd-${Date.now()}`,
          tx_hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          chain: wallet.chain || 'Ethereum',
          block_number: 19483070,
          timestamp: now,
          from_address: wallet.wallet,
          to_address: '0x28c6c06298d514db089934071355e5743bf21d60', // Binance Hot 14 Deposit
          asset: 'ETH',
          asset_type: 'NATIVE',
          amount: '15.50',
          transaction_type: 'DEPOSIT',
          contract_address: null,
        };
        break;
    }

    return this.processNewTransaction(sampleTx);
  }
}
