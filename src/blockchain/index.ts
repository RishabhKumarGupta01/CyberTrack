/**
 * CryptoTrace Intelligence — Blockchain Data Layer
 * 
 * Modular, multi-chain adapter architecture designed for law enforcement forensics.
 * Supports Ethereum, Bitcoin, Solana, TRON, and Avalanche out-of-the-box.
 */

export * from './types';
export * from './BlockchainAdapter';
export * from './adapters/EthereumAdapter';
export * from './adapters/BitcoinAdapter';
export * from './adapters/SolanaAdapter';
export * from './adapters/TronAdapter';
export * from './adapters/AvalancheAdapter';
export * from './AdapterRegistry';
export * from './normalization';
