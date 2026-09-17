/**
 * Test & Verification Suite: Explainable Risk Engine (0–100)
 * 
 * Validates:
 * 1. Score range strictly bounded between 0 and 100
 * 2. All 9 Potential Indicators:
 *    - rapid fund movement
 *    - high transaction velocity
 *    - layering depth
 *    - high-risk entity exposure
 *    - mixer exposure
 *    - bridge activity
 *    - unusual transaction patterns
 *    - high-value transfers
 *    - intermediary wallet count
 * 3. Required return fields:
 *    - risk_score
 *    - risk_level
 *    - risk_factors
 *    - explanation
 * 4. Distinct metric separation:
 *    - RISK SCORE vs VASP ATTRIBUTION CONFIDENCE
 * 5. Legal standard compliance:
 *    - Does NOT claim criminal guilt or criminal ownership
 */

import { RiskEngine } from './RiskEngine';
import { RiskEngineInput } from './types';

function runRiskEngineVerification() {
  console.log('================================================================================');
  console.log('🛡️  CRYPTOTRACE — EXPLAINABLE RISK SCORING ENGINE (0–100) VERIFICATION');
  console.log('================================================================================\n');

  const engine = RiskEngine.getInstance();

  // --------------------------------------------------------------------------
  // TEST 1: Baseline Clean Wallet (Zero Indicators)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Baseline Clean Wallet (Zero/Low Risk) ---');
  const cleanInput: RiskEngineInput = {
    target_address: '0x1111222233334444555566667777888899990000',
    blockchain: 'Ethereum',
    transactions: [],
  };

  const cleanRes = engine.assessRisk(cleanInput);
  console.log(`Address: ${cleanRes.target_address}`);
  console.log(`Risk Score: ${cleanRes.risk_score} / 100`);
  console.log(`Risk Level: ${cleanRes.risk_level}`);
  console.log(`Active Factors: ${cleanRes.risk_factors.length}`);
  console.log(`Explanation: ${cleanRes.explanation.slice(0, 110)}...`);

  if (cleanRes.risk_score !== 0 || cleanRes.risk_level !== 'LOW' || cleanRes.risk_factors.length !== 0) {
    throw new Error('Test 1 failed: Baseline clean address should have 0 score and LOW risk level');
  }
  console.log('  -> PASS: Baseline address returns 0/100 LOW risk.\n');

  // --------------------------------------------------------------------------
  // TEST 2: Individual Indicator Evaluations (All 9 Indicators)
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Validating All 9 Explainable Risk Indicators ---');

  // 1. Rapid Fund Movement
  const f1 = engine.evaluateRapidFundMovement({
    target_address: '0xTARGET',
    transactions: [
      { tx_hash: '0x1', from_address: '0xSENDER', to_address: '0xTARGET', amount: 50, amount_usd: 116500, asset: 'ETH', timestamp: 1000, block_number: 100 },
      { tx_hash: '0x2', from_address: '0xTARGET', to_address: '0xRECEIVER', amount: 48, amount_usd: 112000, asset: 'ETH', timestamp: 1000 + 12 * 60, block_number: 110 },
    ],
  });
  console.log(`  ✓ 1. Rapid Fund Movement: ${f1?.name} (+${f1?.score_impact} pts) [${f1?.severity}]`);
  if (!f1 || f1.indicator !== 'RAPID_FUND_MOVEMENT') throw new Error('Indicator 1 failed');

  // 2. High Transaction Velocity
  const f2 = engine.evaluateHighTransactionVelocity({
    target_address: '0xTARGET',
    velocity_metrics: { tx_count_last_1h: 14, tx_count_last_24h: 35, burst_transactions: 8 },
  });
  console.log(`  ✓ 2. High Transaction Velocity: ${f2?.name} (+${f2?.score_impact} pts) [${f2?.severity}]`);
  if (!f2 || f2.indicator !== 'HIGH_TRANSACTION_VELOCITY') throw new Error('Indicator 2 failed');

  // 3. Layering Depth
  const f3 = engine.evaluateLayeringDepth({
    target_address: '0xTARGET',
    hops_from_source: 4,
  });
  console.log(`  ✓ 3. Layering Depth: ${f3?.name} (+${f3?.score_impact} pts) [${f3?.severity}]`);
  if (!f3 || f3.indicator !== 'LAYERING_DEPTH') throw new Error('Indicator 3 failed');

  // 4. High-Risk Entity Exposure
  const f4 = engine.evaluateHighRiskEntityExposure({
    target_address: '0xTARGET',
    high_risk_exposure: { is_exposed: true, entity_name: 'Lazarus Heist Drainer', entity_type: 'State-Sponsored Exploit', hops: 1 },
  });
  console.log(`  ✓ 4. High-Risk Entity Exposure: ${f4?.name} (+${f4?.score_impact} pts) [${f4?.severity}]`);
  if (!f4 || f4.indicator !== 'HIGH_RISK_ENTITY_EXPOSURE') throw new Error('Indicator 4 failed');

  // 5. Mixer Exposure
  const f5 = engine.evaluateMixerExposure({
    target_address: '0xTARGET',
    mixer_exposure: { direct_interaction: true, mixer_name: 'Tornado Cash Tumbler', volume_usd: 136000 },
  });
  console.log(`  ✓ 5. Mixer Exposure: ${f5?.name} (+${f5?.score_impact} pts) [${f5?.severity}]`);
  if (!f5 || f5.indicator !== 'MIXER_EXPOSURE') throw new Error('Indicator 5 failed');

  // 6. Bridge Activity
  const f6 = engine.evaluateBridgeActivity({
    target_address: '0xTARGET',
    bridge_activity: { used_bridge: true, bridge_name: 'ThorChain Cross Bridge', target_chain: 'Bitcoin', volume_usd: 280000 },
  });
  console.log(`  ✓ 6. Bridge Activity: ${f6?.name} (+${f6?.score_impact} pts) [${f6?.severity}]`);
  if (!f6 || f6.indicator !== 'BRIDGE_ACTIVITY') throw new Error('Indicator 6 failed');

  // 7. Unusual Transaction Patterns
  const f7 = engine.evaluateUnusualTransactionPatterns({
    target_address: '0xTARGET',
    transactions: [
      { tx_hash: '0x1', from_address: '0xA', to_address: '0xTARGET', amount: '100.0', amount_usd: 230000, asset: 'ETH', timestamp: 100, block_number: 10 },
      { tx_hash: '0x2', from_address: '0xTARGET', to_address: '0xB', amount: '50.0', amount_usd: 115000, asset: 'ETH', timestamp: 200, block_number: 20 },
      { tx_hash: '0x3', from_address: '0xTARGET', to_address: '0xC', amount: '50.0', amount_usd: 115000, asset: 'ETH', timestamp: 300, block_number: 30 },
    ],
  });
  console.log(`  ✓ 7. Unusual Transaction Patterns: ${f7?.name} (+${f7?.score_impact} pts) [${f7?.severity}]`);
  if (!f7 || f7.indicator !== 'UNUSUAL_TRANSACTION_PATTERNS') throw new Error('Indicator 7 failed');

  // 8. High-Value Transfers
  const f8 = engine.evaluateHighValueTransfers({
    target_address: '0xTARGET',
    transactions: [
      { tx_hash: '0x1', from_address: '0xA', to_address: '0xTARGET', amount: 1200000, amount_usd: 1200000, asset: 'USDT', timestamp: 100, block_number: 10 },
    ],
  });
  console.log(`  ✓ 8. High-Value Transfers: ${f8?.name} (+${f8?.score_impact} pts) [${f8?.severity}]`);
  if (!f8 || f8.indicator !== 'HIGH_VALUE_TRANSFERS') throw new Error('Indicator 8 failed');

  // 9. Intermediary Wallet Count
  const f9 = engine.evaluateIntermediaryWalletCount({
    target_address: '0xTARGET',
    intermediary_wallets: [
      { address: '0xMule1', retention_rate_pct: 3.8, transit_duration_sec: 840 },
      { address: '0xMule2', retention_rate_pct: 0.5, transit_duration_sec: 920 },
      { address: '0xMule3', retention_rate_pct: 1.2, transit_duration_sec: 600 },
    ],
  });
  console.log(`  ✓ 9. Intermediary Wallet Count: ${f9?.name} (+${f9?.score_impact} pts) [${f9?.severity}]`);
  if (!f9 || f9.indicator !== 'INTERMEDIARY_WALLET_COUNT') throw new Error('Indicator 9 failed');

  console.log('  -> PASS: All 9 risk indicators evaluated successfully.\n');

  // --------------------------------------------------------------------------
  // TEST 3: Composite Complex Forensic Assessment (Operation Velvet Vault Hot Mule)
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Composite Forensic Case Assessment (Velvet Vault Mule) ---');
  const hotMuleInput: RiskEngineInput = {
    target_address: '0xdf81d11b0e27a925439a897b6a65529f33a01102',
    blockchain: 'Ethereum',
    hops_from_source: 4,
    mixer_exposure: {
      direct_interaction: true,
      mixer_name: 'Tornado Cash Tumbler',
      volume_usd: 108000,
      hops: 1,
    },
    bridge_activity: {
      used_bridge: true,
      bridge_name: 'ThorChain Cross Bridge',
      target_chain: 'Bitcoin',
      volume_usd: 280000,
    },
    intermediary_wallets: [
      { address: '0x9c4f196720e17639bb409d57a6279f0411fa12e9', retention_rate_pct: 3.8, transit_duration_sec: 840 },
      { address: '0xdf81d11b0e27a925439a897b6a65529f33a01102', retention_rate_pct: 0.0, transit_duration_sec: 600 },
    ],
    velocity_metrics: {
      tx_count_last_1h: 6,
      tx_count_last_24h: 18,
      burst_transactions: 4,
    },
    transactions: [
      {
        tx_hash: '0x19c8f2207b4e1902847a9812450147cb9820f789123049182390481239882a01',
        from_address: '0xd4b88df4d29f5cedae2459b10729541e8d88820', // Tornado Cash
        to_address: '0xdf81d11b0e27a925439a897b6a65529f33a01102',
        amount: '46.0',
        amount_usd: 108000,
        asset: 'ETH',
        timestamp: 1788183000,
        block_number: 18451100,
      },
      {
        tx_hash: '0x6666666666666666666666666666666666666666666666666666666666666666',
        from_address: '0xdf81d11b0e27a925439a897b6a65529f33a01102',
        to_address: '0x28c6c06298d514db089934071355e5743bf21d60', // Binance Hot 14
        amount: '1200000.00',
        amount_usd: 1200000,
        asset: 'USDT',
        timestamp: 1788183000 + 18 * 60, // Swept in 18 minutes!
        block_number: 18451200,
      },
    ],
  };

  const complexRes = engine.assessRisk(hotMuleInput);

  // Assert required keys
  if (
    typeof complexRes.risk_score !== 'number' ||
    !complexRes.risk_level ||
    !Array.isArray(complexRes.risk_factors) ||
    typeof complexRes.explanation !== 'string'
  ) {
    throw new Error('Test 3 failed: Missing required return keys (risk_score, risk_level, risk_factors, explanation)');
  }

  // Assert score bounds
  if (complexRes.risk_score < 0 || complexRes.risk_score > 100) {
    throw new Error(`Test 3 failed: Risk score ${complexRes.risk_score} out of 0–100 bounds!`);
  }

  console.log(`Target Address: ${complexRes.target_address}`);
  console.log(`Risk Score: ${complexRes.risk_score} / 100`);
  console.log(`Risk Level: ${complexRes.risk_level}`);
  console.log(`Active Risk Factors Count: ${complexRes.risk_factors.length}`);
  complexRes.risk_factors.forEach((f, i) => {
    console.log(`  [${i + 1}] ${f.name} (+${f.score_impact} pts, ${f.severity})`);
    console.log(`      Evidence: ${f.evidence}`);
  });

  console.log('\n--- Narrative Explanation ---');
  console.log(complexRes.explanation);

  console.log('  -> PASS: Composite assessment returned all required fields within bounds.\n');

  // --------------------------------------------------------------------------
  // TEST 4: Metric Separation (Risk Score vs VASP Attribution Confidence)
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Metric Separation — RISK SCORE vs VASP ATTRIBUTION CONFIDENCE ---');
  console.log(`Risk Score: ${complexRes.metric_separation.risk_score}/100 (${complexRes.risk_level})`);
  console.log(`VASP Attribution Confidence: ${complexRes.metric_separation.vasp_attribution_confidence}%`);
  console.log(`Attributed Entity: ${complexRes.metric_separation.attributed_entity_name}`);
  console.log(`Separation Rationale:\n${complexRes.metric_separation.metric_contrast_explanation}`);

  // Test Case: Official Binance Hot Wallet (High VASP Confidence, Low/Moderate Behavioral Risk)
  const officialBinanceInput: RiskEngineInput = {
    target_address: '0x28c6c06298d514db089934071355e5743bf21d60', // Binance Hot Wallet 14
    blockchain: 'Ethereum',
  };
  const binanceRes = engine.assessRisk(officialBinanceInput);
  console.log('\n[Case: Verified Binance Infrastructure]');
  console.log(`Address: ${binanceRes.target_address}`);
  console.log(`Risk Score: ${binanceRes.risk_score}/100 (${binanceRes.risk_level})`);
  console.log(`VASP Confidence: ${binanceRes.metric_separation.vasp_attribution_confidence}% (${binanceRes.metric_separation.attributed_entity_name})`);

  if (binanceRes.metric_separation.vasp_attribution_confidence < 98 || binanceRes.risk_score > 30) {
    throw new Error('Test 4 failed: Official exchange wallet should have high VASP confidence and low risk score');
  }
  console.log('  -> PASS: Confirmed strict orthogonal separation of Risk Score from VASP Attribution Confidence.\n');

  // --------------------------------------------------------------------------
  // TEST 5: Legal Evidentiary Standard (No Criminal Guilt/Ownership Claims)
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Evidentiary Legal Disclaimer Verification ---');
  console.log(`Disclaimer: "${complexRes.legal_disclaimer}"`);

  if (!complexRes.legal_disclaimer.includes('DO NOT constitute a legal determination of criminal guilt') ||
      !complexRes.legal_disclaimer.includes('criminal ownership')) {
    throw new Error('Test 5 failed: Legal disclaimer does not satisfy non-guilt/non-ownership requirement');
  }
  console.log('  -> PASS: Disclaimer strictly satisfies non-guilt / non-ownership requirement.\n');

  console.log('================================================================================');
  console.log('✅ ALL EXPLAINABLE RISK SCORING ENGINE TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================================');
}

runRiskEngineVerification();
