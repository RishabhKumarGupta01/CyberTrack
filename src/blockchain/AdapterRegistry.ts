import { BlockchainAdapter } from './BlockchainAdapter';
import { EthereumAdapter } from './adapters/EthereumAdapter';
import { BitcoinAdapter } from './adapters/BitcoinAdapter';
import { SolanaAdapter } from './adapters/SolanaAdapter';
import { TronAdapter } from './adapters/TronAdapter';
import { AvalancheAdapter } from './adapters/AvalancheAdapter';
import { SupportedChain } from './types';

/**
 * BlockchainAdapterRegistry
 * 
 * Factory and Registry for blockchain adapters.
 * 
 * DESIGN PRINCIPLE:
 * Downstream forensic components (Transaction Graph, Wallet Intelligence,
 * Peeling Chain Detector, Risk Engine) query the registry using uniform methods.
 * 
 * Multi-chain support (Ethereum, Bitcoin, Solana, TRON, Avalanche) is registered here
 * without modifying or rewriting the forensic analytics engine.
 */
export class BlockchainAdapterRegistry {
  private static instance: BlockchainAdapterRegistry;
  private adapters: Map<string, BlockchainAdapter> = new Map();
  private aliasMap: Map<string, string> = new Map();

  private constructor() {
    // 1. Ethereum
    this.register(new EthereumAdapter(), ['ETH', 'ETHEREUM', 'EVM', 'MAINNET']);
    // 2. Bitcoin
    this.register(new BitcoinAdapter(), ['BTC', 'BITCOIN', 'UTXO']);
    // 3. Solana
    this.register(new SolanaAdapter(), ['SOL', 'SOLANA', 'SPL']);
    // 4. TRON
    this.register(new TronAdapter(), ['TRX', 'TRON', 'TRC20', 'TRC-20']);
    // 5. Avalanche
    this.register(new AvalancheAdapter(), ['AVAX', 'AVALANCHE', 'CCHAIN', 'C-CHAIN']);
  }

  /**
   * Singleton instance accessor
   */
  public static getInstance(): BlockchainAdapterRegistry {
    if (!BlockchainAdapterRegistry.instance) {
      BlockchainAdapterRegistry.instance = new BlockchainAdapterRegistry();
    }
    return BlockchainAdapterRegistry.instance;
  }

  /**
   * Register a new adapter into the system.
   * Enables plug-and-play addition of new chains.
   */
  public register(adapter: BlockchainAdapter, aliases: string[] = []): void {
    const canonicalKey = adapter.blockchain.toLowerCase();
    this.adapters.set(canonicalKey, adapter);

    // Map canonical name and all provided aliases to the canonical key
    this.aliasMap.set(canonicalKey, canonicalKey);
    this.aliasMap.set(adapter.nativeAsset.toLowerCase(), canonicalKey);
    for (const alias of aliases) {
      this.aliasMap.set(alias.toLowerCase(), canonicalKey);
    }
  }

  /**
   * Retrieve an adapter by chain name or ticker alias (e.g. 'Ethereum', 'ETH', 'BTC', 'SOL', 'TRX', 'AVAX').
   */
  public get(chainOrAlias: string): BlockchainAdapter {
    const key = chainOrAlias.trim().toLowerCase();
    const canonicalKey = this.aliasMap.get(key) || key;
    const adapter = this.adapters.get(canonicalKey);

    if (!adapter) {
      const supported = Array.from(this.adapters.values()).map(a => `${a.blockchain} (${a.nativeAsset})`).join(', ');
      throw new Error(`No adapter registered for blockchain "${chainOrAlias}". Supported chains: ${supported}`);
    }

    return adapter;
  }

  /**
   * Checks if an adapter is available for the given chain.
   */
  public has(chainOrAlias: string): boolean {
    const key = chainOrAlias.trim().toLowerCase();
    const canonicalKey = this.aliasMap.get(key) || key;
    return this.adapters.has(canonicalKey);
  }

  /**
   * Automatically detects and returns the appropriate adapter based on address format.
   * - 0x... -> Ethereum (or Avalanche if tagged)
   * - 1..., 3..., bc1... -> Bitcoin
   * - T... (34 chars) -> TRON
   * - Base58 (32-44 chars) -> Solana
   */
  public detectAdapterForAddress(address: string, preferredChain?: string): BlockchainAdapter | null {
    if (!address || typeof address !== 'string') return null;
    const clean = address.trim();

    // If preferredChain was specified and matches, prioritize it
    if (preferredChain && this.has(preferredChain)) {
      const preferred = this.get(preferredChain);
      if (preferred.validate_address(clean)) {
        return preferred;
      }
    }

    // Heuristic order
    // 1. Bitcoin
    if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(clean) || /^bc1[ac-hj-np-z02-9]{38,90}$/i.test(clean)) {
      return this.get('Bitcoin');
    }

    // 2. TRON
    if (/^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(clean)) {
      return this.get('Tron');
    }

    // 3. Ethereum / EVM (0x format)
    if (/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      return this.get('Ethereum');
    }

    // 4. Avalanche X/P Chain
    if (/^[XP]-avax1[ac-hj-np-z02-9]{38}$/i.test(clean)) {
      return this.get('Avalanche');
    }

    // 5. Solana Base58
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) {
      return this.get('Solana');
    }

    // Fallback scan across all adapters
    for (const adapter of this.adapters.values()) {
      if (adapter.validate_address(clean)) {
        return adapter;
      }
    }

    return null;
  }

  /**
   * List all currently registered adapter chains.
   */
  public listSupportedChains(): Array<{ blockchain: SupportedChain | string; nativeAsset: string; decimals: number }> {
    return Array.from(this.adapters.values()).map(a => ({
      blockchain: a.blockchain,
      nativeAsset: a.nativeAsset,
      decimals: a.nativeDecimals,
    }));
  }
}

/** Default singleton export for convenience */
export const blockchainRegistry = BlockchainAdapterRegistry.getInstance();
