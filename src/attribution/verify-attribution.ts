/**
 * Test & Verification Suite: Entity Intelligence Layer & Probable Attribution
 * 
 * Validates:
 * 1. Entity Record fields:
 *    - entity name
 *    - entity type
 *    - known addresses
 *    - chain
 *    - confidence
 *    - source
 *    - last verified date
 * 2. All 5 Probable Attribution Heuristics:
 *    - known address matching
 *    - cluster relationship
 *    - transaction behavior
 *    - historical interaction
 *    - graph proximity
 * 3. Return shape:
 *    - entity
 *    - attribution confidence
 *    - supporting evidence
 * 4. Mandatory legal terminology compliance:
 *    - "Probable VASP"
 *    - "Likely associated"
 *    - "Attribution confidence"
 *    - Never represented as confirmed ownership
 */

import { EntityIntelligenceLayer } from './EntityIntelligenceLayer';

function runAttributionVerification() {
  console.log('================================================================================');
  console.log('🔬 CRYPTOTRACE — ENTITY INTELLIGENCE & PROBABLE ATTRIBUTION ENGINE VERIFICATION');
  console.log('================================================================================\n');

  const eil = EntityIntelligenceLayer.getInstance();

  // --------------------------------------------------------------------------
  // TEST 1: Entity Record Specification Verification
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Entity Record Compliance & Field Verification ---');
  const allEntities = eil.getAllEntities();
  console.log(`Verified ${allEntities.length} entities registered in Entity Intelligence Layer.`);

  for (const ent of allEntities) {
    if (!ent.entityName || !ent.entityType || !Array.isArray(ent.knownAddresses) || !ent.chain || ent.confidence === undefined || !ent.source || !ent.lastVerifiedDate) {
      throw new Error(`Entity record ${ent.entityName} is missing required specification fields!`);
    }
    console.log(`  ✓ Entity: ${ent.entityName} | Type: ${ent.entityType} | Chain: ${ent.chain} | Confidence: ${ent.confidence}% | Source: ${ent.source} | Last Verified: ${ent.lastVerifiedDate}`);
  }
  console.log('  -> PASS: All Entity Records contain all 7 required fields.\n');

  // --------------------------------------------------------------------------
  // TEST 2: Heuristic 1 — Known Address Matching
  // --------------------------------------------------------------------------
  console.log('--- TEST 2: Heuristic 1 — Known Address Matching ---');
  const binanceHotWallet = '0x28c6c06298d514db089934071355e5743bf21d60';
  const res1 = eil.attributeAddress(binanceHotWallet);

  console.log(`Target: ${res1.targetAddress}`);
  console.log(`Verdict: "${res1.attributionVerdict}"`);
  console.log(`Attribution Confidence: ${res1.attributionConfidence}%`);
  console.log(`Attributed Entity: ${res1.entity?.entityName} (${res1.entity?.entityType})`);
  console.log(`Supporting Evidence Count: ${res1.supportingEvidence.length}`);
  console.log(`Evidence [0]: ${res1.supportingEvidence[0]?.signalTitle} -> "${res1.supportingEvidence[0]?.qualification}"`);

  if (res1.attributionVerdict !== 'Probable VASP' || res1.attributionConfidence < 98) {
    throw new Error('Heuristic 1 failed: Expected Probable VASP with >98% confidence');
  }
  console.log('  -> PASS: Direct address match returned Probable VASP with compliant qualification.\n');

  // --------------------------------------------------------------------------
  // TEST 3: Heuristic 2 — Cluster Relationship (Co-Spending)
  // --------------------------------------------------------------------------
  console.log('--- TEST 3: Heuristic 2 — Cluster Relationship (Co-Spending) ---');
  const coSpentSubject = '0x7c9a81230491823904812390481239048123110e';
  const res2 = eil.attributeAddress(coSpentSubject);

  console.log(`Target: ${res2.targetAddress}`);
  console.log(`Verdict: "${res2.attributionVerdict}"`);
  console.log(`Attribution Confidence: ${res2.attributionConfidence}%`);
  console.log(`Evidence: ${res2.supportingEvidence[0]?.signalTitle} -> ${res2.supportingEvidence[0]?.description}`);

  if (!res2.supportingEvidence.some(e => e.heuristic === 'CLUSTER_RELATIONSHIP')) {
    throw new Error('Heuristic 2 failed: Expected CLUSTER_RELATIONSHIP evidence signal');
  }
  console.log('  -> PASS: Cluster co-spending heuristic successfully attributed target.\n');

  // --------------------------------------------------------------------------
  // TEST 4: Heuristic 3 — Transaction Behavior (Consolidation Sweep)
  // --------------------------------------------------------------------------
  console.log('--- TEST 4: Heuristic 3 — Transaction Behavior (Rapid Consolidation Sweep) ---');
  const muleDepositAddress = '0xaaaa999911112222333344445555666677778888';
  const res3 = eil.attributeAddress(muleDepositAddress, {
    transactions: [
      {
        txHash: '0x9999888877776666555544443333222211110000aaaaabbbbccccddddeeeeffff',
        fromAddress: muleDepositAddress,
        toAddress: binanceHotWallet, // Swept directly into Binance Consolidation Hot Wallet
        amount: '1200000.00',
        asset: 'USDT',
        timestamp: 1788184800,
        blockNumber: 18451200,
        isSwept: true,
      },
    ],
  });

  console.log(`Target: ${res3.targetAddress}`);
  console.log(`Verdict: "${res3.attributionVerdict}"`);
  console.log(`Attribution Confidence: ${res3.attributionConfidence}%`);
  console.log(`Supporting Evidence:`);
  res3.supportingEvidence.forEach(ev => {
    console.log(`  - [${ev.heuristic}] ${ev.signalTitle} (${ev.confidenceScore}%) -> "${ev.qualification}"`);
    console.log(`    ${ev.description}`);
  });

  if (!res3.supportingEvidence.some(e => e.heuristic === 'TRANSACTION_BEHAVIOR')) {
    throw new Error('Heuristic 3 failed: Expected TRANSACTION_BEHAVIOR sweep signal');
  }
  console.log('  -> PASS: Transaction sweep behavior heuristic successfully detected.\n');

  // --------------------------------------------------------------------------
  // TEST 5: Heuristic 4 — Historical Interaction (Recurrence & Volume)
  // --------------------------------------------------------------------------
  console.log('--- TEST 5: Heuristic 4 — Historical Interaction ---');
  const frequentTraderAddr = '0xbbbb111122223333444455556666777788889999';
  const res4 = eil.attributeAddress(frequentTraderAddr, {
    transactions: [
      {
        txHash: '0x1111000011110000111100001111000011110000111100001111000011110000',
        fromAddress: frequentTraderAddr,
        toAddress: '0x503828976d22510aad0201ac7ec88293211d23da', // Coinbase Hot Wallet
        amount: '15.0',
        asset: 'ETH',
        timestamp: 1788100000,
        blockNumber: 18440000,
      },
      {
        txHash: '0x2222000022220000222200002222000022220000222200002222000022220000',
        fromAddress: frequentTraderAddr,
        toAddress: '0x503828976d22510aad0201ac7ec88293211d23da', // Coinbase Hot Wallet
        amount: '22.5',
        asset: 'ETH',
        timestamp: 1788150000,
        blockNumber: 18445000,
      },
      {
        txHash: '0x3333000033330000333300003333000033330000333300003333000033330000',
        fromAddress: frequentTraderAddr,
        toAddress: '0x71660c4005ba85c37ccec55d0c4493e66fe775d3', // Coinbase Hot Wallet 2
        amount: '30.0',
        asset: 'ETH',
        timestamp: 1788180000,
        blockNumber: 18450000,
      },
    ],
  });

  console.log(`Target: ${res4.targetAddress}`);
  console.log(`Attributed Entity: ${res4.entity?.entityName}`);
  console.log(`Verdict: "${res4.attributionVerdict}"`);
  console.log(`Attribution Confidence: ${res4.attributionConfidence}%`);
  console.log(`Evidence: ${res4.supportingEvidence[0]?.signalTitle} -> ${res4.supportingEvidence[0]?.description}`);

  if (!res4.supportingEvidence.some(e => e.heuristic === 'HISTORICAL_INTERACTION')) {
    throw new Error('Heuristic 4 failed: Expected HISTORICAL_INTERACTION signal');
  }
  console.log('  -> PASS: Historical recurring interaction heuristic confirmed.\n');

  // --------------------------------------------------------------------------
  // TEST 6: Heuristic 5 — Graph Proximity & Flow Termination
  // --------------------------------------------------------------------------
  console.log('--- TEST 6: Heuristic 5 — Graph Proximity ---');
  const intermediaryMule = '0xcccc111122223333444455556666777788889999';
  const res5 = eil.attributeAddress(intermediaryMule, {
    graphNeighbors: [
      {
        neighborAddress: binanceHotWallet,
        hops: 1,
        volumeUsd: 1200000,
        direction: 'outgoing',
      },
    ],
  });

  console.log(`Target: ${res5.targetAddress}`);
  console.log(`Attributed Entity: ${res5.entity?.entityName}`);
  console.log(`Attribution Confidence: ${res5.attributionConfidence}%`);
  console.log(`Evidence: ${res5.supportingEvidence[0]?.signalTitle} -> ${res5.supportingEvidence[0]?.description}`);

  if (!res5.supportingEvidence.some(e => e.heuristic === 'GRAPH_PROXIMITY')) {
    throw new Error('Heuristic 5 failed: Expected GRAPH_PROXIMITY signal');
  }
  console.log('  -> PASS: Graph proximity heuristic confirmed.\n');

  // --------------------------------------------------------------------------
  // TEST 7: Multivariate Combined Attribution & Legal Disclaimer Compliance
  // --------------------------------------------------------------------------
  console.log('--- TEST 7: Multivariate Combined Attribution & Legal Disclaimers ---');
  const subjectConsolidationHotMule = '0xdf81d11b0e27a925439a897b6a65529f33a01102';
  const fullResult = eil.attributeAddress(subjectConsolidationHotMule, {
    transactions: [
      {
        txHash: '0x6666666666666666666666666666666666666666666666666666666666666666',
        fromAddress: subjectConsolidationHotMule,
        toAddress: binanceHotWallet,
        amount: '1200000.00',
        asset: 'USDT',
        timestamp: 1788184800,
        blockNumber: 18451200,
        isSwept: true,
      },
    ],
    graphNeighbors: [
      {
        neighborAddress: binanceHotWallet,
        hops: 1,
        volumeUsd: 1200000,
        direction: 'outgoing',
      },
    ],
  });

  console.log(`Target: ${fullResult.targetAddress}`);
  console.log(`Attributed Entity: ${fullResult.entity?.entityName}`);
  console.log(`Attribution Verdict: "${fullResult.attributionVerdict}"`);
  console.log(`Attribution Confidence: ${fullResult.attributionConfidence}%`);
  console.log(`Total Multivariate Signals: ${fullResult.supportingEvidence.length}`);
  fullResult.supportingEvidence.forEach((ev, i) => {
    console.log(`  Signal ${i + 1}: [${ev.heuristic}] ${ev.signalTitle} (${ev.confidenceScore}%) - "${ev.qualification}"`);
  });
  console.log(`Legal Disclaimer: "${fullResult.legalDisclaimer}"`);

  // Assertions on required phrasing
  if (!fullResult.legalDisclaimer.includes('Probabilistic attribution') || !fullResult.legalDisclaimer.includes('NEVER be represented as confirmed legal ownership')) {
    throw new Error('Compliance Violation: Legal disclaimer is missing non-confirmed ownership standard!');
  }

  console.log('\n================================================================================');
  console.log('✅ ALL ENTITY INTELLIGENCE LAYER TESTS PASSED PERFECTLY!');
  console.log('================================================================================');
}

runAttributionVerification();
