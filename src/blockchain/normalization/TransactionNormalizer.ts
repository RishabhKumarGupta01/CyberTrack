import { AdapterTokenTransfer, AdapterTransaction } from '../types';
import { AssetType, NormalizationOptions, NormalizedTransaction, TransactionType } from './types';

/**
 * TransactionNormalizer
 * 
 * Central engine responsible for transforming heterogeneous blockchain data
 * (raw RPC responses, Etherscan JSON, Mempool.space UTXOs, Solana logs, TronGrid payload)
 * into a single clean, provider-agnostic internal representation.
 */
export class TransactionNormalizer {
  /**
   * Normalizes an AdapterTransaction (typically a native transfer or contract call).
   */
  public static fromAdapterTransaction(
    tx: AdapterTransaction,
    options: NormalizationOptions = {}
  ): NormalizedTransaction {
    const chain = tx.blockchain || 'Ethereum';
    const txHash = tx.hash;
    const blockNumber = tx.blockNumber || 0;
    const timestamp = tx.timestamp || Math.floor(Date.now() / 1000);
    const fromAddress = tx.from || '';
    const toAddress = tx.to || '';
    const asset = tx.assetSymbol || 'ETH';
    const amount = tx.value || '0.0';

    const assetType: AssetType = options.customAssetType || 'NATIVE';
    
    let transactionType: TransactionType = options.customTxType || 'TRANSFER';
    if (tx.isContractInteraction) {
      transactionType = (amount === '0' || amount === '0.0' || parseFloat(amount) === 0) 
        ? 'CONTRACT_EXECUTION' 
        : 'TRANSFER';
    }

    const transactionId = this.generateTransactionId(chain, txHash, null);

    return {
      transaction_id: transactionId,
      tx_hash: txHash,
      chain,
      block_number: blockNumber,
      timestamp,
      from_address: fromAddress,
      to_address: toAddress,
      asset,
      asset_type: assetType,
      amount,
      transaction_type: transactionType,
      contract_address: null,

      // Enrichment
      date_time: tx.dateTime || new Date(timestamp * 1000).toISOString(),
      amount_usd: options.usdRate ? parseFloat(amount) * options.usdRate : null,
      fee: tx.fee || null,
      fee_usd: options.feeUsdRate && tx.fee ? parseFloat(tx.fee) * options.feeUsdRate : null,
      status: tx.status,
      log_index: null,
      metadata: {
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        nonce: tx.nonce,
        isContractInteraction: tx.isContractInteraction,
      },
    };
  }

  /**
   * Normalizes an AdapterTokenTransfer (ERC-20, TRC-20, SPL, ARC-20).
   */
  public static fromAdapterTokenTransfer(
    transfer: AdapterTokenTransfer,
    options: NormalizationOptions = {}
  ): NormalizedTransaction {
    const chain = transfer.blockchain || 'Ethereum';
    const txHash = transfer.hash;
    const blockNumber = transfer.blockNumber || 0;
    const timestamp = transfer.timestamp || Math.floor(Date.now() / 1000);
    const fromAddress = transfer.from || '';
    const toAddress = transfer.to || '';
    const asset = transfer.tokenSymbol || 'TOKEN';
    const amount = transfer.value || '0.0';
    const contractAddress = transfer.contractAddress || null;

    const assetType: AssetType = options.customAssetType || this.inferAssetType(chain, false);
    const transactionType: TransactionType = options.customTxType || 'TOKEN_TRANSFER';
    const logIndex = transfer.logIndex ?? 0;
    const transactionId = this.generateTransactionId(chain, txHash, logIndex);

    return {
      transaction_id: transactionId,
      tx_hash: txHash,
      chain,
      block_number: blockNumber,
      timestamp,
      from_address: fromAddress,
      to_address: toAddress,
      asset,
      asset_type: assetType,
      amount,
      transaction_type: transactionType,
      contract_address: contractAddress,

      // Enrichment
      date_time: transfer.dateTime || new Date(timestamp * 1000).toISOString(),
      amount_usd: options.usdRate ? parseFloat(amount) * options.usdRate : null,
      status: 'confirmed',
      log_index: logIndex,
      metadata: {
        tokenName: transfer.tokenName,
        tokenDecimals: transfer.tokenDecimals,
        valueRaw: transfer.valueRaw,
      },
    };
  }

  /**
   * Normalizes arbitrary raw JSON payloads from RPCs or indexers.
   */
  public static normalizeRaw(
    raw: Record<string, any>,
    chain: string,
    options: NormalizationOptions = {}
  ): NormalizedTransaction {
    const txHash = raw.hash || raw.tx_hash || raw.txid || raw.txID || raw.signature || '0x0';
    const blockNumber = parseInt(raw.blockNumber || raw.block_number || raw.block_height || raw.slot || '0', 10) || 0;
    
    let timestamp = Math.floor(Date.now() / 1000);
    if (raw.timestamp || raw.timeStamp || raw.block_timestamp || raw.block_time || raw.blockTime) {
      const rawTime = raw.timestamp || raw.timeStamp || raw.block_timestamp || raw.block_time || raw.blockTime;
      timestamp = typeof rawTime === 'string' && rawTime.length > 11 
        ? Math.floor(new Date(rawTime).getTime() / 1000) 
        : parseInt(rawTime, 10);
      // If milliseconds were passed, convert to seconds
      if (timestamp > 10000000000) timestamp = Math.floor(timestamp / 1000);
    }

    const fromAddress = raw.from || raw.from_address || raw.sender || raw.owner_address || '';
    const toAddress = raw.to || raw.to_address || raw.recipient || raw.contract_address || '';
    const contractAddress = raw.contractAddress || raw.contract_address || raw.token_address || null;
    const isToken = !!contractAddress || raw.tokenSymbol !== undefined;

    const asset = raw.asset || raw.tokenSymbol || raw.assetSymbol || this.getDefaultNativeAsset(chain);
    const amount = raw.amount || raw.value || raw.formattedAmount || '0.0';

    const assetType = options.customAssetType || this.inferAssetType(chain, !isToken);
    const transactionType = options.customTxType || (isToken ? 'TOKEN_TRANSFER' : 'TRANSFER');
    const logIndex = raw.logIndex !== undefined ? parseInt(raw.logIndex, 10) : null;
    const transactionId = this.generateTransactionId(chain, txHash, logIndex);

    return {
      transaction_id: transactionId,
      tx_hash: txHash,
      chain,
      block_number: blockNumber,
      timestamp,
      from_address: fromAddress,
      to_address: toAddress,
      asset,
      asset_type: assetType,
      amount: String(amount),
      transaction_type: transactionType,
      contract_address: contractAddress,
      date_time: new Date(timestamp * 1000).toISOString(),
      amount_usd: options.usdRate ? parseFloat(String(amount)) * options.usdRate : null,
      status: raw.status || (raw.isError === '0' || raw.err === null ? 'confirmed' : 'failed'),
      log_index: logIndex,
      metadata: raw,
    };
  }

  /**
   * Batch normalizes an array of adapter transactions and/or token transfers.
   * Outputs clean, sorted, deduplicated records.
   */
  public static normalizeBatch(
    items: Array<AdapterTransaction | AdapterTokenTransfer | Record<string, any>>,
    chain: string,
    options: NormalizationOptions = {}
  ): NormalizedTransaction[] {
    const results: NormalizedTransaction[] = [];
    const seenIds = new Set<string>();

    for (const item of items) {
      let normalized: NormalizedTransaction;

      if ('contractAddress' in item && 'tokenSymbol' in item) {
        normalized = this.fromAdapterTokenTransfer(item as AdapterTokenTransfer, options);
      } else if ('valueRaw' in item && 'assetSymbol' in item) {
        normalized = this.fromAdapterTransaction(item as AdapterTransaction, options);
      } else {
        normalized = this.normalizeRaw(item, chain, options);
      }

      if (!seenIds.has(normalized.transaction_id)) {
        seenIds.add(normalized.transaction_id);
        results.push(normalized);
      }
    }

    // Sort chronologically descending (newest first)
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generates a deterministic, collision-free transaction ID.
   * Format: `tx_{chain_prefix}_{clean_hash}_{suffix}`
   */
  public static generateTransactionId(
    chain: string,
    txHash: string,
    logIndex?: number | null
  ): string {
    const prefix = chain.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4) || 'tx';
    const cleanHash = txHash.replace(/^0x/, '').slice(0, 16).toLowerCase();
    const suffix = logIndex !== null && logIndex !== undefined ? `_log${logIndex}` : '';
    return `tx_${prefix}_${cleanHash}${suffix}`;
  }

  /**
   * Infers asset type from blockchain and native status.
   */
  public static inferAssetType(chain: string, isNative: boolean): AssetType {
    if (isNative) return 'NATIVE';
    const lower = chain.toLowerCase();
    if (lower.includes('eth') || lower.includes('evm') || lower.includes('polygon') || lower.includes('bsc')) {
      return 'TOKEN_ERC20';
    }
    if (lower.includes('tron')) return 'TOKEN_TRC20';
    if (lower.includes('solana')) return 'TOKEN_SPL';
    if (lower.includes('avax') || lower.includes('avalanche')) return 'TOKEN_ARC20';
    if (lower.includes('btc') || lower.includes('bitcoin')) return 'RUNES';
    return 'UNKNOWN';
  }

  private static getDefaultNativeAsset(chain: string): string {
    const lower = chain.toLowerCase();
    if (lower.includes('eth')) return 'ETH';
    if (lower.includes('btc') || lower.includes('bitcoin')) return 'BTC';
    if (lower.includes('sol')) return 'SOL';
    if (lower.includes('tron')) return 'TRX';
    if (lower.includes('avax') || lower.includes('avalanche')) return 'AVAX';
    return 'COIN';
  }
}
