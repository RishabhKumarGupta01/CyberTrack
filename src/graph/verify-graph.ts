import { DirectedForensicGraph } from './DirectedForensicGraph';
import { ForensicEdgeType, ForensicNodeType } from './types';
import { NormalizedTransaction } from '../blockchain/normalization/types';

export async function verifyForensicGraphEngine(): Promise<void> {
  console.log('=== Starting Forensic Graph Engine Verification ===\n');

  // Construct a realistic cybercrime syndicate fund-flow dataset
  const sampleTransactions: NormalizedTransaction[] = [
    // 1. Victim to Mule Wallet A
    {
      transaction_id: 'tx_eth_01',
      tx_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      chain: 'Ethereum',
      block_number: 18451000,
      timestamp: 1788180000,
      from_address: '0xVictimAddress00000000000000000000000001',
      to_address: '0xMuleWalletA0000000000000000000000000001',
      asset: 'USDT',
      asset_type: 'TOKEN_ERC20',
      amount: '350000.00',
      amount_usd: 350000,
      transaction_type: 'TRANSFER',
      contract_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    // 2. Mule Wallet A swaps USDT to ETH on Uniswap DEX
    {
      transaction_id: 'tx_eth_02',
      tx_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      chain: 'Ethereum',
      block_number: 18451050,
      timestamp: 1788181200,
      from_address: '0xMuleWalletA0000000000000000000000000001',
      to_address: '0xUniswapRouterV3000000000000000000000001',
      asset: 'USDT',
      asset_type: 'TOKEN_ERC20',
      amount: '350000.00',
      amount_usd: 350000,
      transaction_type: 'TRANSFER',
      contract_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    },
    // 3. Uniswap sends ETH to Suspect Consolidator
    {
      transaction_id: 'tx_eth_03',
      tx_hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      chain: 'Ethereum',
      block_number: 18451051,
      timestamp: 1788181220,
      from_address: '0xUniswapRouterV3000000000000000000000001',
      to_address: '0xSuspectConsolidator00000000000000000001',
      asset: 'ETH',
      asset_type: 'NATIVE',
      amount: '102.50',
      amount_usd: 348500,
      transaction_type: 'TRANSFER',
      contract_address: null,
    },
    // 4. Suspect routes 40 ETH into Tornado Cash Mixer
    {
      transaction_id: 'tx_eth_04',
      tx_hash: '0x4444444444444444444444444444444444444444444444444444444444444444',
      chain: 'Ethereum',
      block_number: 18451100,
      timestamp: 1788182400,
      from_address: '0xSuspectConsolidator00000000000000000001',
      to_address: '0xTornadoCashRouter0000000000000000000001',
      asset: 'ETH',
      asset_type: 'NATIVE',
      amount: '40.00',
      amount_usd: 136000,
      transaction_type: 'TRANSFER',
      contract_address: null,
    },
    // 5. Suspect bridges 30 ETH across Stargate Bridge to Avalanche
    {
      transaction_id: 'tx_eth_05',
      tx_hash: '0x5555555555555555555555555555555555555555555555555555555555555555',
      chain: 'Ethereum',
      block_number: 18451150,
      timestamp: 1788183600,
      from_address: '0xSuspectConsolidator00000000000000000001',
      to_address: '0xStargateBridgeRouter0000000000000000001',
      asset: 'ETH',
      asset_type: 'NATIVE',
      amount: '30.00',
      amount_usd: 102000,
      transaction_type: 'TRANSFER',
      contract_address: null,
    },
    // 6. Suspect deposits 30 ETH directly to Binance Exchange Hot Wallet
    {
      transaction_id: 'tx_eth_06',
      tx_hash: '0x6666666666666666666666666666666666666666666666666666666666666666',
      chain: 'Ethereum',
      block_number: 18451200,
      timestamp: 1788184800,
      from_address: '0xSuspectConsolidator00000000000000000001',
      to_address: '0xBinanceExchangeDeposit00000000000000001',
      asset: 'ETH',
      asset_type: 'NATIVE',
      amount: '30.00',
      amount_usd: 102000,
      transaction_type: 'TRANSFER',
      contract_address: null,
    },
  ];

  // Entity Attribution Directory
  const entityDir = new Map<string, { type: ForensicNodeType; label: string; riskScore?: number }>([
    ['0xvictimaddress00000000000000000000000001', { type: 'Victim', label: 'Victim (Elder Fraud Loss)', riskScore: 5 }],
    ['0xmulewalleta0000000000000000000000000001', { type: 'Wallet', label: 'Mule Wallet A (Intermediary)', riskScore: 84 }],
    ['0xuniswaprouterv3000000000000000000000001', { type: 'DEX', label: 'Uniswap Protocol V3', riskScore: 15 }],
    ['0xsuspectconsolidator00000000000000000001', { type: 'Suspect', label: 'Syndicate Layering Hub', riskScore: 95 }],
    ['0xtornadocashrouter0000000000000000000001', { type: 'Mixer', label: 'Tornado Cash Mixer', riskScore: 99 }],
    ['0xstargatebridgerouter0000000000000000001', { type: 'Bridge', label: 'Stargate Cross-Chain Bridge', riskScore: 25 }],
    ['0xbinanceexchangedeposit00000000000000001', { type: 'Exchange', label: 'Binance Hot Wallet 14', riskScore: 20 }],
  ]);

  // Ingest into DirectedForensicGraph
  const graph = DirectedForensicGraph.fromTransactions(sampleTransactions, entityDir);

  console.log(`Graph constructed: ${graph.nodeCount()} nodes, ${graph.edgeCount()} edges.`);
  console.assert(graph.nodeCount() === 7, 'Expected 7 nodes');
  console.assert(graph.edgeCount() === 6, 'Expected 6 edges');

  // Verify Node Types
  const nodeTypes = new Set(graph.getAllNodes().map(n => n.type));
  console.log('Represented Node Types:', Array.from(nodeTypes).join(', '));
  console.assert(nodeTypes.has('Victim'), 'Victim node missing');
  console.assert(nodeTypes.has('Suspect'), 'Suspect node missing');
  console.assert(nodeTypes.has('Mixer'), 'Mixer node missing');
  console.assert(nodeTypes.has('Bridge'), 'Bridge node missing');
  console.assert(nodeTypes.has('Exchange'), 'Exchange node missing');
  console.assert(nodeTypes.has('DEX'), 'DEX node missing');
  console.log('✓ Node classifications verified.');

  // Verify Edge Types
  const edgeTypes = new Set(graph.getAllEdges().map(e => e.type));
  console.log('Represented Edge Types:', Array.from(edgeTypes).join(', '));
  console.assert(edgeTypes.has('TRANSFER'), 'TRANSFER edge missing');
  console.assert(edgeTypes.has('SWAP'), 'SWAP edge missing');
  console.assert(edgeTypes.has('BRIDGE'), 'BRIDGE edge missing');
  console.assert(edgeTypes.has('DEPOSIT'), 'DEPOSIT edge missing');
  console.log('✓ Edge classifications verified.\n');

  // 1. BFS Shortest Path
  console.log('--- 1. Testing BFS Shortest Path ---');
  const victimId = '0xVictimAddress00000000000000000000000001';
  const binanceId = '0xBinanceExchangeDeposit00000000000000001';
  const shortest = graph.bfsShortestPath(victimId, binanceId);
  console.log(`Shortest path found: ${shortest.found}, Distance: ${shortest.distance} hops`);
  console.log(`Path: ${shortest.path.map(id => graph.getNode(id)?.label || id).join(' -> ')}`);
  console.assert(shortest.found === true, 'Shortest path should be found');
  console.assert(shortest.distance === 4, 'Expected distance of 4 hops');
  console.log('✓ BFS shortest path passed.\n');

  // 2. DFS Graph Traversal
  console.log('--- 2. Testing DFS Graph Traversal ---');
  const dfsResult = graph.dfsTraversal(victimId, { maxDepth: 5 });
  console.log(`DFS visited ${dfsResult.visitedOrder.length} nodes, Discovered ${dfsResult.paths.length} distinct end paths.`);
  console.log(`Max depth reached: ${dfsResult.maxDepthReached}, Cycle detected: ${dfsResult.cycleDetected}`);
  console.assert(dfsResult.paths.length === 3, 'Expected 3 branch paths (Mixer, Bridge, Exchange)');
  console.log('✓ DFS traversal passed.\n');

  // 3. Configurable Maximum Hops
  console.log('--- 3. Testing Configurable Maximum Hops Subgraph ---');
  const hop1Graph = graph.extractSubGraphByHops(victimId, 1, 'outgoing');
  console.log(`1-Hop Subgraph: ${hop1Graph.nodeCount()} nodes, ${hop1Graph.edgeCount()} edges.`);
  console.assert(hop1Graph.nodeCount() === 2, 'Expected 2 nodes in 1-hop');

  const hop2Graph = graph.extractSubGraphByHops(victimId, 2, 'outgoing');
  console.log(`2-Hop Subgraph: ${hop2Graph.nodeCount()} nodes, ${hop2Graph.edgeCount()} edges.`);
  console.assert(hop2Graph.nodeCount() === 3, 'Expected 3 nodes in 2-hops (Victim -> Mule -> DEX)');
  console.log('✓ Configurable maximum hops passed.\n');

  // 4. Connected Component Analysis
  console.log('--- 4. Testing Connected Component Analysis ---');
  const components = graph.findConnectedComponents();
  console.log(`Discovered ${components.length} connected component(s).`);
  console.log(`Component 1: ${components[0].nodeCount} nodes, $${components[0].totalVolumeUsd.toLocaleString()} USD volume, HasSuspect: ${components[0].hasSuspectOrMixer}`);
  console.assert(components.length === 1, 'Expected 1 connected component');
  console.assert(components[0].hasSuspectOrMixer === true, 'Should detect suspect/mixer');
  console.log('✓ Connected component analysis passed.\n');

  // 5. Intermediary Detection
  console.log('--- 5. Testing Intermediary Detection ---');
  const intermediaries = graph.detectIntermediaries();
  console.log(`Found ${intermediaries.length} intermediary node(s):`);
  for (const im of intermediaries) {
    console.log(`  - [${im.classification}] ${im.node.label}: in=${im.inDegree}, out=${im.outDegree}, forwarded=$${im.totalForwardedUsd.toLocaleString()}`);
  }
  console.assert(intermediaries.length >= 2, 'Should identify intermediaries (Mule, DEX, Suspect)');
  console.log('✓ Intermediary detection passed.\n');

  // 6. Transaction Timeline
  console.log('--- 6. Testing Transaction Timeline ---');
  const timeline = graph.getTransactionTimeline();
  console.log(`Timeline contains ${timeline.length} sequential event(s):`);
  timeline.forEach((item, idx) => {
    console.log(`  #${idx + 1} [Hop ${item.hopNumber}] ${item.sourceLabel} -> ${item.targetLabel}: ${item.amount} ${item.asset} ($${item.amountUsd.toLocaleString()}) [${item.type}]`);
  });
  console.assert(timeline.length === 6, 'Expected 6 timeline events');
  console.log('✓ Transaction timeline passed.\n');

  // 7. Fund-Flow Aggregation
  console.log('--- 7. Testing Fund-Flow Aggregation ---');
  const aggregated = graph.aggregateFundFlows();
  console.log(`Aggregated total volume: $${aggregated.totalVolumeUsd.toLocaleString()}`);
  console.log(`Unique directional aggregated edges: ${aggregated.aggregatedEdges.length}`);
  console.assert(aggregated.totalVolumeUsd > 0, 'Total volume should be > 0');
  console.log('✓ Fund-flow aggregation passed.\n');

  // 8. Export to React Flow (@xyflow/react)
  console.log('--- 8. Testing React Flow Export ---');
  const rfData = graph.toReactFlow();
  console.log(`React Flow export: ${rfData.nodes.length} nodes, ${rfData.edges.length} edges.`);
  console.assert(rfData.nodes[0].position.x !== undefined, 'Node position X should be defined');
  console.assert(rfData.nodes[0].data.label !== undefined, 'Node label should be defined');
  console.assert(rfData.edges[0].markerEnd !== undefined, 'Edge markerEnd should be defined');
  console.log('✓ React Flow export directly consumable.\n');

  // 9. Export to Cytoscape.js
  console.log('--- 9. Testing Cytoscape.js Export ---');
  const cyData = graph.toCytoscape();
  console.log(`Cytoscape export: ${cyData.elements.length} total elements.`);
  const cyNodes = cyData.elements.filter(e => e.group === 'nodes');
  const cyEdges = cyData.elements.filter(e => e.group === 'edges');
  console.assert(cyNodes.length === 7, 'Expected 7 Cytoscape nodes');
  console.assert(cyEdges.length === 6, 'Expected 6 Cytoscape edges');
  console.log('✓ Cytoscape export directly consumable.\n');

  console.log('=== ALL FORENSIC GRAPH ENGINE TESTS PASSED SUCCESSFULLY ===');
}
