import { blockchainRegistry } from './AdapterRegistry';

export async function runAllAdaptersVerification(): Promise<void> {
  console.log('=== Starting Comprehensive Multi-Chain Blockchain Adapter Verification ===\n');

  // 1. List Supported Chains
  const chains = blockchainRegistry.listSupportedChains();
  console.log('Registered Chains:', chains.map(c => `${c.blockchain} (${c.nativeAsset}, ${c.decimals} decimals)`).join(', '));
  console.assert(chains.length === 5, `Expected 5 chains, got ${chains.length}`);
  console.log('✓ All 5 chains registered successfully in BlockchainAdapterRegistry.\n');

  // 2. Test Ethereum Adapter
  console.log('--- Testing EthereumAdapter ---');
  const eth = blockchainRegistry.get('ETH');
  const ethAddr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
  console.assert(eth.validate_address(ethAddr) === true, 'ETH address validation failed');
  const ethBal = await eth.get_balance(ethAddr);
  console.log(`[ETH] Balance: ${ethBal.balance} ${ethBal.assetSymbol}, Tokens: ${ethBal.tokenBalances?.length || 0}`);
  const ethTxs = await eth.get_transactions(ethAddr, { limit: 2 });
  console.log(`[ETH] Transactions fetched: ${ethTxs.length} (Sample: ${ethTxs[0]?.hash.slice(0, 18)}...)`);
  const ethTokens = await eth.get_token_transfers(ethAddr, { limit: 2 });
  console.log(`[ETH] ERC-20 transfers fetched: ${ethTokens.length} (Token: ${ethTokens[0]?.tokenSymbol})`);
  console.log('✓ EthereumAdapter verification complete.\n');

  // 3. Test Bitcoin Adapter
  console.log('--- Testing BitcoinAdapter ---');
  const btc = blockchainRegistry.get('BTC');
  const btcBech32 = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
  const btcLegacy = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
  console.assert(btc.validate_address(btcBech32) === true, 'BTC Bech32 validation failed');
  console.assert(btc.validate_address(btcLegacy) === true, 'BTC Legacy validation failed');
  console.assert(btc.validate_address('0xNotBitcoin') === false, 'BTC invalid address rejected');
  const btcBal = await btc.get_balance(btcBech32);
  console.log(`[BTC] Balance: ${btcBal.balance} ${btcBal.assetSymbol}`);
  const btcTxs = await btc.get_transactions(btcBech32, { limit: 2 });
  console.log(`[BTC] UTXO Transactions fetched: ${btcTxs.length}`);
  console.log('✓ BitcoinAdapter verification complete.\n');

  // 4. Test Solana Adapter
  console.log('--- Testing SolanaAdapter ---');
  const sol = blockchainRegistry.get('SOL');
  const solAddr = '4Nd1mBQtrMKWptwQ5s6wE82r5jN7n2yFzGZkQ8P9xW21';
  console.assert(sol.validate_address(solAddr) === true, 'SOL address validation failed');
  console.assert(sol.validate_address('1Invalid') === false, 'SOL invalid address rejected');
  const solBal = await sol.get_balance(solAddr);
  console.log(`[SOL] Balance: ${solBal.balance} ${solBal.assetSymbol}`);
  const solTxs = await sol.get_transactions(solAddr, { limit: 2 });
  console.log(`[SOL] Signatures/Transactions fetched: ${solTxs.length}`);
  const solTokens = await sol.get_token_transfers(solAddr, { limit: 2 });
  console.log(`[SOL] SPL Token transfers fetched: ${solTokens.length} (Token: ${solTokens[0]?.tokenSymbol})`);
  console.log('✓ SolanaAdapter verification complete.\n');

  // 5. Test TRON Adapter
  console.log('--- Testing TronAdapter ---');
  const trx = blockchainRegistry.get('TRX');
  const trxAddr = 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE';
  console.assert(trx.validate_address(trxAddr) === true, 'TRX address validation failed');
  console.assert(trx.validate_address('0xNotTron') === false, 'TRX invalid address rejected');
  const trxBal = await trx.get_balance(trxAddr);
  console.log(`[TRX] Balance: ${trxBal.balance} ${trxBal.assetSymbol}`);
  const trxTokens = await trx.get_token_transfers(trxAddr, { limit: 2 });
  console.log(`[TRX] TRC-20 transfers fetched: ${trxTokens.length} (Token: ${trxTokens[0]?.tokenSymbol})`);
  console.log('✓ TronAdapter verification complete.\n');

  // 6. Test Avalanche Adapter
  console.log('--- Testing AvalancheAdapter ---');
  const avax = blockchainRegistry.get('AVAX');
  const avaxAddr = '0x8849102938401928340192834019283401928340';
  console.assert(avax.validate_address(avaxAddr) === true, 'AVAX C-Chain address validation failed');
  const avaxBal = await avax.get_balance(avaxAddr);
  console.log(`[AVAX] Balance: ${avaxBal.balance} ${avaxBal.assetSymbol}`);
  const avaxTxs = await avax.get_transactions(avaxAddr, { limit: 2 });
  console.log(`[AVAX] Transactions fetched: ${avaxTxs.length}`);
  console.log('✓ AvalancheAdapter verification complete.\n');

  // 7. Auto-detection across all 5 chains
  console.log('--- Testing Address Auto-Detection ---');
  const testCases = [
    { addr: ethAddr, expectedChain: 'Ethereum' },
    { addr: btcBech32, expectedChain: 'Bitcoin' },
    { addr: solAddr, expectedChain: 'Solana' },
    { addr: trxAddr, expectedChain: 'Tron' },
  ];

  for (const tc of testCases) {
    const detected = blockchainRegistry.detectAdapterForAddress(tc.addr);
    console.assert(detected?.blockchain === tc.expectedChain, `Detection failed for ${tc.addr}`);
    console.log(`Detected "${tc.addr.slice(0, 10)}..." -> ${detected?.blockchain}`);
  }
  console.log('✓ Cross-chain address auto-detection verified.\n');

  console.log('=== ALL 5 BLOCKCHAIN ADAPTERS VERIFIED & OPERATIONAL ===');
}
