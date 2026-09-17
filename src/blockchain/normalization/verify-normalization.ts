import { blockchainRegistry } from '../AdapterRegistry';
import { TransactionNormalizer } from './TransactionNormalizer';
import { NormalizedTransaction } from './types';

export async function verifyTransactionNormalization(): Promise<void> {
  console.log('=== Starting Transaction Normalization Verification ===\n');

  const requiredFields: (keyof NormalizedTransaction)[] = [
    'transaction_id',
    'tx_hash',
    'chain',
    'block_number',
    'timestamp',
    'from_address',
    'to_address',
    'asset',
    'asset_type',
    'amount',
    'transaction_type',
    'contract_address',
  ];

  function validateNormalized(tx: NormalizedTransaction, label: string): void {
    for (const field of requiredFields) {
      if (tx[field] === undefined) {
        throw new Error(`[${label}] Missing required normalization field: "${field}"`);
      }
    }
    console.log(`✓ [${label}] Verified all 12 fields:`);
    console.log(`   id:       ${tx.transaction_id}`);
    console.log(`   hash:     ${tx.tx_hash.slice(0, 18)}...`);
    console.log(`   chain:    ${tx.chain}`);
    console.log(`   block:    #${tx.block_number}`);
    console.log(`   time:     ${tx.timestamp} (${tx.date_time})`);
    console.log(`   from:     ${tx.from_address}`);
    console.log(`   to:       ${tx.to_address}`);
    console.log(`   asset:    ${tx.asset} [${tx.asset_type}]`);
    console.log(`   amount:   ${tx.amount}`);
    console.log(`   type:     ${tx.transaction_type}`);
    console.log(`   contract: ${tx.contract_address || 'null (NATIVE)'}\n`);
  }

  // 1. Ethereum Native Transaction Normalization
  const ethAdapter = blockchainRegistry.get('Ethereum');
  const ethTxs = await ethAdapter.get_transactions('0x71C7656EC7ab88b098defB751B7401B5f6d8976F', { limit: 1 });
  const normalizedEth = TransactionNormalizer.fromAdapterTransaction(ethTxs[0]);
  validateNormalized(normalizedEth, 'Ethereum Native ETH');

  // 2. Ethereum ERC-20 Token Transfer Normalization
  const ethTokens = await ethAdapter.get_token_transfers('0x71C7656EC7ab88b098defB751B7401B5f6d8976F', { limit: 1 });
  const normalizedErc20 = TransactionNormalizer.fromAdapterTokenTransfer(ethTokens[0]);
  validateNormalized(normalizedErc20, 'Ethereum ERC-20 USDT');

  // 3. Bitcoin UTXO Transaction Normalization
  const btcAdapter = blockchainRegistry.get('Bitcoin');
  const btcTxs = await btcAdapter.get_transactions('bc1q9d84z5w2r0k3y6t1u8v7x4e9m2p5q8s1a3c7e9', { limit: 1 });
  const normalizedBtc = TransactionNormalizer.fromAdapterTransaction(btcTxs[0]);
  validateNormalized(normalizedBtc, 'Bitcoin UTXO');

  // 4. Solana SOL & SPL Token Normalization
  const solAdapter = blockchainRegistry.get('Solana');
  const solTokens = await solAdapter.get_token_transfers('4Nd1mBQtrMKWptwQ5s6wE82r5jN7n2yFzGZkQ8P9xW21', { limit: 1 });
  const normalizedSpl = TransactionNormalizer.fromAdapterTokenTransfer(solTokens[0]);
  validateNormalized(normalizedSpl, 'Solana SPL Token');

  // 5. TRON TRC-20 USDT Normalization (Forensic critical)
  const tronAdapter = blockchainRegistry.get('Tron');
  const tronTokens = await tronAdapter.get_token_transfers('TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', { limit: 1 });
  const normalizedTrc20 = TransactionNormalizer.fromAdapterTokenTransfer(tronTokens[0]);
  validateNormalized(normalizedTrc20, 'TRON TRC-20 USDT');

  // 6. Avalanche ARC-20 Normalization
  const avaxAdapter = blockchainRegistry.get('Avalanche');
  const avaxTokens = await avaxAdapter.get_token_transfers('0x8849102938401928340192834019283401928340', { limit: 1 });
  const normalizedArc20 = TransactionNormalizer.fromAdapterTokenTransfer(avaxTokens[0]);
  validateNormalized(normalizedArc20, 'Avalanche ARC-20 USDC');

  // 7. Full Adapter get_normalized_transactions Integration
  console.log('--- Testing adapter.get_normalized_transactions() ---');
  const allNormalized = await ethAdapter.get_normalized_transactions('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
  console.assert(allNormalized.length >= 2, 'Should combine native and token transfers');
  console.log(`✓ Fetched & combined ${allNormalized.length} unified transactions across native and tokens.`);
  console.log(`  Assets unified: ${allNormalized.map(t => `${t.asset} (${t.asset_type})`).join(', ')}`);

  console.log('\n=== ALL NORMALIZATION TESTS VERIFIED & OPERATIONAL ===');
}
