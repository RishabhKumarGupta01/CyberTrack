import {
  AdapterBalance,
  AdapterNetworkInfo,
  AdapterTokenTransfer,
  AdapterTransaction,
  PaginationOptions,
  SupportedChain,
  TokenTransferOptions,
} from './types';
import { NormalizedTransaction } from './normalization/types';
import { TransactionNormalizer } from './normalization/TransactionNormalizer';

/**
 * BlockchainAdapter — Abstract Contract
 * 
 * Defines the standardized interface that all blockchain-specific implementations
 * (Ethereum, Bitcoin, Solana, etc.) must fulfill.
 * 
 * Forensic analytics, Graph engines, and Surveillance modules interact exclusively
 * through this contract, ensuring complete modularity and chain-agnosticism.
 */
export abstract class BlockchainAdapter {
  /** The canonical blockchain name (e.g., 'Ethereum', 'Bitcoin') */
  abstract readonly blockchain: SupportedChain | string;

  /** Native asset ticker symbol (e.g., 'ETH', 'BTC', 'SOL') */
  abstract readonly nativeAsset: string;

  /** Standard address decimal places for native coin */
  abstract readonly nativeDecimals: number;

  /**
   * Validate whether a string conforms to the address format and checksum for this chain.
   */
  abstract validate_address(address: string): boolean;

  /**
   * Format or checksum an address according to chain standards (e.g. EIP-55 for Ethereum).
   */
  abstract format_address(address: string): string;

  /**
   * Fetch native balance and optionally known ERC-20/token balances for a given address.
   */
  abstract get_balance(address: string): Promise<AdapterBalance>;

  /**
   * Retrieve single transaction details by its hash.
   */
  abstract get_transaction(txHash: string): Promise<AdapterTransaction | null>;

  /**
   * Retrieve historical transaction activity for an address with optional pagination.
   */
  abstract get_transactions(
    address: string,
    options?: PaginationOptions
  ): Promise<AdapterTransaction[]>;

  /**
   * Retrieve token (ERC-20, SPL, TRC-20) transfers involving the given address.
   */
  abstract get_token_transfers(
    address: string,
    options?: TokenTransferOptions
  ): Promise<AdapterTokenTransfer[]>;

  /**
   * Fetch latest mined block height for the blockchain.
   */
  abstract get_latest_block_number(): Promise<number>;

  /**
   * Retrieve general network status and synchronization state.
   */
  abstract get_network_info(): Promise<AdapterNetworkInfo>;

  /**
   * Retrieves historical transactions and token transfers, normalized into
   * a uniform, provider-independent NormalizedTransaction representation.
   */
  async get_normalized_transactions(
    address: string,
    options?: PaginationOptions
  ): Promise<NormalizedTransaction[]> {
    const [txs, tokens] = await Promise.all([
      this.get_transactions(address, options).catch(() => []),
      this.get_token_transfers(address, options).catch(() => []),
    ]);
    return TransactionNormalizer.normalizeBatch([...txs, ...tokens], this.blockchain);
  }
}

