/**
 * Verification Test Suite: Real-Time Monitoring & Wallet Watchlists
 * 
 * Verifies:
 * 1. Monitored wallet entity structure has the 5 required fields:
 *    - wallet
 *    - case
 *    - status
 *    - last_checked
 *    - last_transaction
 * 2. Automated generation of all 8 Alert Typologies:
 *    - NEW_TRANSACTION
 *    - HIGH_VALUE_TRANSFER
 *    - RAPID_FORWARDING
 *    - LAYERING_DETECTED
 *    - CROSS_CHAIN_ACTIVITY
 *    - HIGH_RISK_ENTITY
 *    - MIXER_EXPOSURE
 *    - EXCHANGE_DEPOSIT
 * 3. Event-driven blockchain subscription provider architecture (WebSocket & Polling pluggability)
 */

import { WatchlistManager } from './WatchlistManager';
import {
  WebSocketSubscriptionProvider,
  PollingSubscriptionProvider,
  SimulatedStreamProvider,
} from './SubscriptionProvider';
import { MonitoringAlertType, MonitoredWallet } from './types';

async function runVerification() {
  console.log('='.repeat(70));
  console.log('CRIME TRACE INTELLIGENCE: REAL-TIME MONITORING VERIFICATION SUITE');
  console.log('='.repeat(70));

  const manager = WatchlistManager.getInstance();

  // --------------------------------------------------------------------------
  // TEST 1: Verify Monitored Wallet Entity Fields (wallet, case, status, last_checked, last_transaction)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Verifying Monitored Wallet Entity Schema & Fields...');
  const wallets = manager.getWallets();
  console.log(`✓ Retrieved ${wallets.length} monitored target wallets from watchlist.`);

  if (wallets.length === 0) {
    throw new Error('Watchlist is empty; expected pre-seeded targets.');
  }

  for (const w of wallets) {
    const hasWallet = typeof w.wallet === 'string' && w.wallet.length > 0;
    const hasCase = typeof w.case === 'string' && w.case.length > 0;
    const hasStatus = ['ACTIVE', 'PAUSED', 'ARCHIVED'].includes(w.status);
    const hasLastChecked = typeof w.last_checked === 'string' && !isNaN(Date.parse(w.last_checked));
    const hasLastTxProp = 'last_transaction' in w; // can be null or object

    if (!hasWallet || !hasCase || !hasStatus || !hasLastChecked || !hasLastTxProp) {
      console.error('Invalid wallet record:', w);
      throw new Error(`Monitored wallet missing mandatory field: ${JSON.stringify(w)}`);
    }
  }

  const sampleWallet: MonitoredWallet = wallets[0];
  console.log(`✓ Monitored Wallet Schema Validated:`);
  console.log(`   - wallet:           ${sampleWallet.wallet}`);
  console.log(`   - case:             ${sampleWallet.case}`);
  console.log(`   - status:           ${sampleWallet.status}`);
  console.log(`   - last_checked:     ${sampleWallet.last_checked}`);
  console.log(`   - last_transaction: ${sampleWallet.last_transaction ? sampleWallet.last_transaction.tx_hash : 'null'}`);

  // --------------------------------------------------------------------------
  // TEST 2: Verify Automated Generation of All 8 Alert Typologies
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Verifying Automated Alert Generation for All 8 Alert Types...');

  const requiredAlertTypes: MonitoringAlertType[] = [
    'NEW_TRANSACTION',
    'HIGH_VALUE_TRANSFER',
    'RAPID_FORWARDING',
    'LAYERING_DETECTED',
    'CROSS_CHAIN_ACTIVITY',
    'HIGH_RISK_ENTITY',
    'MIXER_EXPOSURE',
    'EXCHANGE_DEPOSIT',
  ];

  const triggeredAlertTypes = new Set<MonitoringAlertType>();

  // Track live alert callbacks
  let liveAlertCount = 0;
  const unsubscribeAlerts = manager.onAlert((alert) => {
    liveAlertCount++;
    triggeredAlertTypes.add(alert.alert_type);
  });

  const testTarget = sampleWallet.wallet;

  for (const alertType of requiredAlertTypes) {
    const alerts = manager.triggerTestScenario(alertType, testTarget);
    const matched = alerts.find((a) => a.alert_type === alertType);

    if (!matched) {
      throw new Error(`Failed to trigger alert type: ${alertType}`);
    }

    console.log(`  ✓ Alert Type [${alertType.padEnd(21)}]: Triggered successfully!`);
    console.log(`    → Title: ${matched.title}`);
    console.log(`    → Severity: ${matched.severity} | Case: ${matched.case}`);
  }

  unsubscribeAlerts();

  console.log(`\n✓ All ${requiredAlertTypes.length} alert types triggered and validated.`);
  console.log(`✓ Total real-time alerts received by Pub/Sub event bus: ${liveAlertCount}`);

  // Verify wallet state updated after transactions
  const updatedWallet = manager.getWallet(testTarget);
  if (!updatedWallet?.last_transaction) {
    throw new Error('Monitored wallet last_transaction was not updated after transaction detection.');
  }
  console.log(`✓ Monitored wallet last_transaction successfully updated to hash: ${updatedWallet.last_transaction.tx_hash.slice(0, 16)}...`);
  console.log(`✓ Monitored wallet last_checked updated to: ${updatedWallet.last_checked}`);

  // --------------------------------------------------------------------------
  // TEST 3: Verify Pluggable Event-Driven Subscription Architecture
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Verifying Pluggable Event-Driven Subscription Architecture...');

  // 3a. WebSocket Subscription Provider
  const wsProvider = new WebSocketSubscriptionProvider({
    url: 'wss://ethereum-rpc.publicnode.com',
  });
  console.log(`✓ Initialized WebSocketSubscriptionProvider: [${wsProvider.name}], type: ${wsProvider.providerType}`);
  let wsSubReceived = false;
  const wsSubId = wsProvider.subscribe('0x71c7656ec7ab88b098defb751b7401b5f6d8976f', 'Ethereum', (tx) => {
    wsSubReceived = true;
  });
  wsProvider.dispatchTransaction({
    transaction_id: 'tx-ws-test-01',
    tx_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    chain: 'Ethereum',
    block_number: 19483100,
    timestamp: Math.floor(Date.now() / 1000),
    from_address: '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
    to_address: '0x28c6c06298d514db089934071355e5743bf21d60',
    asset: 'ETH',
    asset_type: 'NATIVE',
    amount: '5.0',
    transaction_type: 'TRANSFER',
    contract_address: null,
  });
  if (!wsSubReceived) {
    throw new Error('WebSocket subscription did not dispatch incoming event.');
  }
  console.log('✓ WebSocketSubscriptionProvider event dispatching verified.');
  wsProvider.unsubscribe(wsSubId);

  // 3b. Polling Subscription Provider
  const pollProvider = new PollingSubscriptionProvider({ intervalMs: 2000 });
  console.log(`✓ Initialized PollingSubscriptionProvider: [${pollProvider.name}], type: ${pollProvider.providerType}`);

  // 3c. Hot-swap provider on WatchlistManager
  const originalProvider = manager.getSubscriptionProvider();
  await manager.setSubscriptionProvider(wsProvider);
  console.log(`✓ Successfully hot-swapped provider to WebSocket: ${manager.getSubscriptionProvider().name}`);

  // Restore simulated stream provider
  await manager.setSubscriptionProvider(new SimulatedStreamProvider());
  console.log(`✓ Successfully restored provider to SimulatedStreamProvider.`);

  // --------------------------------------------------------------------------
  // TEST 4: Verify Watchlist CRUD operations
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Verifying Watchlist CRUD Operations...');
  const newAddr = '0x9999000011112222333344445555666677778888';
  const created = manager.addWallet({
    wallet: newAddr,
    case: 'INV-2023-0899',
    status: 'ACTIVE',
    label: 'Test Drug Syndicate Mule',
    risk_score: 85,
    alert_threshold_usd: 1000,
  });
  console.log(`✓ Added wallet ${created.wallet} for case ${created.case}`);

  manager.updateWalletStatus(newAddr, 'PAUSED');
  if (manager.getWallet(newAddr)?.status !== 'PAUSED') {
    throw new Error('Failed to update wallet status to PAUSED.');
  }
  console.log(`✓ Updated status to PAUSED`);

  manager.removeWallet(newAddr);
  if (manager.getWallet(newAddr)) {
    throw new Error('Failed to remove wallet from watchlist.');
  }
  console.log(`✓ Successfully removed wallet from watchlist.`);

  console.log('\n' + '='.repeat(70));
  console.log('ALL REAL-TIME MONITORING TESTS PASSED PERFECTLY!');
  console.log('='.repeat(70));
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  if (typeof (globalThis as any).process !== 'undefined') {
    (globalThis as any).process.exit(1);
  }
});
