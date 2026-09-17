import { Node as ReactFlowNode, Edge as ReactFlowEdge, MarkerType } from '@xyflow/react';
import { NormalizedTransaction } from '../blockchain/normalization/types';
import type { CrawlerTraceResult } from '../services/api';
import {
  AggregatedFlowEdge,
  ConnectedComponent,
  CytoscapeElement,
  CytoscapeGraphData,
  DfsTraversalResult,
  ForensicEdgeType,
  ForensicNodeType,
  GraphEdge,
  GraphNode,
  IntermediaryNode,
  ReactFlowGraphData,
  ShortestPathResult,
  TimelineItem,
} from './types';

/**
 * DirectedForensicGraph
 * 
 * High-performance directed multigraph engine tailored for blockchain forensics.
 * Ingests normalized multi-chain transactions, classifies entities, executes graph algorithms,
 * and compiles directly into React Flow and Cytoscape formats.
 */
export class DirectedForensicGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();

  // Graph Adjacency Structures
  private outgoingEdges: Map<string, GraphEdge[]> = new Map();
  private incomingEdges: Map<string, GraphEdge[]> = new Map();
  private outgoingNeighbors: Map<string, Set<string>> = new Map();
  private incomingNeighbors: Map<string, Set<string>> = new Map();

  constructor() {}

  // ==========================================================================
  // Graph Mutation & Ingestion
  // ==========================================================================

  public addNode(node: GraphNode): this {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, { ...node });
      this.outgoingEdges.set(node.id, []);
      this.incomingEdges.set(node.id, []);
      this.outgoingNeighbors.set(node.id, new Set());
      this.incomingNeighbors.set(node.id, new Set());
    } else {
      // Merge node data
      const existing = this.nodes.get(node.id)!;
      existing.totalIncomingUsd += node.totalIncomingUsd;
      existing.totalOutgoingUsd += node.totalOutgoingUsd;
      if (node.riskScore !== undefined) existing.riskScore = Math.max(existing.riskScore || 0, node.riskScore);
      if (node.type !== 'Wallet' && existing.type === 'Wallet') existing.type = node.type;
    }
    return this;
  }

  public addEdge(edge: GraphEdge): this {
    if (!this.nodes.has(edge.source)) {
      this.addNode({
        id: edge.source,
        type: 'Wallet',
        label: this.truncateAddress(edge.source),
        address: edge.source,
        blockchain: 'Ethereum',
        totalIncomingUsd: 0,
        totalOutgoingUsd: edge.amountUsd,
      });
    }

    if (!this.nodes.has(edge.target)) {
      this.addNode({
        id: edge.target,
        type: 'Wallet',
        label: this.truncateAddress(edge.target),
        address: edge.target,
        blockchain: 'Ethereum',
        totalIncomingUsd: edge.amountUsd,
        totalOutgoingUsd: 0,
      });
    }

    this.edges.set(edge.id, { ...edge });

    // Update adjacency
    this.outgoingEdges.get(edge.source)!.push(edge);
    this.incomingEdges.get(edge.target)!.push(edge);
    this.outgoingNeighbors.get(edge.source)!.add(edge.target);
    this.incomingNeighbors.get(edge.target)!.add(edge.source);

    // Update node flow totals
    const sourceNode = this.nodes.get(edge.source)!;
    const targetNode = this.nodes.get(edge.target)!;
    sourceNode.totalOutgoingUsd += edge.amountUsd;
    targetNode.totalIncomingUsd += edge.amountUsd;

    return this;
  }

  public getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  public getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): GraphEdge[] {
    return Array.from(this.edges.values());
  }

  public nodeCount(): number {
    return this.nodes.size;
  }

  public edgeCount(): number {
    return this.edges.size;
  }

  // ==========================================================================
  // Factory: Construct from Normalized Transactions
  // ==========================================================================

  public static fromTransactions(
    transactions: NormalizedTransaction[],
    entityDirectory: Map<string, { type: ForensicNodeType; label: string; riskScore?: number }> = new Map()
  ): DirectedForensicGraph {
    const graph = new DirectedForensicGraph();

    for (const tx of transactions) {
      const fromAddr = tx.from_address;
      const toAddr = tx.to_address;
      if (!fromAddr || !toAddr) continue;

      const amountUsd = tx.amount_usd || (parseFloat(tx.amount) > 0 ? parseFloat(tx.amount) * 3200 : 0);

      // Infer or classify from node
      const fromEntity = entityDirectory.get(fromAddr.toLowerCase());
      const fromType: ForensicNodeType = fromEntity?.type || (tx.metadata?.isVictim ? 'Victim' : 'Wallet');
      const fromLabel = fromEntity?.label || graph.truncateAddress(fromAddr);

      graph.addNode({
        id: fromAddr,
        type: fromType,
        label: fromLabel,
        address: fromAddr,
        blockchain: tx.chain,
        riskScore: fromEntity?.riskScore || (tx.metadata?.isVictim ? 10 : 40),
        totalIncomingUsd: 0,
        totalOutgoingUsd: 0,
        firstSeen: tx.timestamp,
        lastSeen: tx.timestamp,
      });

      // Infer or classify to node
      const toEntity = entityDirectory.get(toAddr.toLowerCase());
      let toType: ForensicNodeType = toEntity?.type || 'Wallet';
      if (!toEntity) {
        if (tx.asset_type === 'TOKEN_ERC20' && tx.contract_address) {
          toType = 'Wallet';
        } else if (tx.transaction_type === 'CONTRACT_EXECUTION') {
          toType = 'Smart Contract';
        }
      }
      const toLabel = toEntity?.label || graph.truncateAddress(toAddr);

      graph.addNode({
        id: toAddr,
        type: toType,
        label: toLabel,
        address: toAddr,
        blockchain: tx.chain,
        riskScore: toEntity?.riskScore || (toType === 'Mixer' ? 99 : toType === 'Exchange' ? 15 : 50),
        totalIncomingUsd: 0,
        totalOutgoingUsd: 0,
        firstSeen: tx.timestamp,
        lastSeen: tx.timestamp,
      });

      // Infer edge type
      let edgeType: ForensicEdgeType = 'TRANSFER';
      if (toType === 'Exchange' || toType === 'VASP') edgeType = 'DEPOSIT';
      else if (fromType === 'Exchange' || fromType === 'VASP') edgeType = 'WITHDRAWAL';
      else if (toType === 'DEX') edgeType = 'SWAP';
      else if (toType === 'Bridge') edgeType = 'BRIDGE';
      else if (toType === 'Mixer' || tx.asset_type === 'RUNES') edgeType = 'TRANSFER';
      else if (toType === 'Smart Contract' || tx.transaction_type === 'CONTRACT_EXECUTION') edgeType = 'CONTRACT_INTERACTION';

      const edgeId = `edge_${tx.transaction_id || tx.tx_hash.slice(0, 12)}_${fromAddr.slice(0, 6)}_${toAddr.slice(0, 6)}`;

      graph.addEdge({
        id: edgeId,
        source: fromAddr,
        target: toAddr,
        type: edgeType,
        amount: tx.amount,
        amountUsd,
        asset: tx.asset,
        txHash: tx.tx_hash,
        timestamp: tx.timestamp,
        blockNumber: tx.block_number,
        isSuspicious: tx.status === 'failed' || toType === 'Mixer' || (fromEntity?.riskScore || 0) > 80,
        metadata: tx.metadata,
      });
    }

    return graph;
  }

  /**
   * Factory: Construct graph from automated multi-hop crawler results
   */
  public static fromCrawlerResult(result: CrawlerTraceResult): DirectedForensicGraph {
    const graph = new DirectedForensicGraph();
    const isBtc = result.blockchain.toLowerCase().includes('btc') || result.blockchain.toLowerCase().includes('bitcoin');
    const unitPriceUsd = isBtc ? 68000 : 3200;

    for (const n of result.nodes) {
      let nodeType: ForensicNodeType = 'Wallet';
      const rawType = (n.type || '').toLowerCase();
      if (rawType.includes('suspect')) nodeType = 'Suspect';
      else if (rawType.includes('victim')) nodeType = 'Victim';
      else if (rawType.includes('mixer')) nodeType = 'Mixer';
      else if (rawType.includes('exchange') || rawType.includes('vasp')) nodeType = 'Exchange';
      else if (rawType.includes('dex')) nodeType = 'DEX';
      else if (rawType.includes('bridge')) nodeType = 'Bridge';
      else if (rawType.includes('contract')) nodeType = 'Smart Contract';

      const incomingUsd = (n.totalIncoming || 0) * unitPriceUsd;
      const outgoingUsd = (n.totalOutgoing || 0) * unitPriceUsd;

      let riskScore = 30;
      if (nodeType === 'Mixer') riskScore = 99;
      else if (nodeType === 'Suspect') riskScore = 88;
      else if (nodeType === 'Exchange') riskScore = 45;
      else if (nodeType === 'Victim') riskScore = 15;

      graph.addNode({
        id: n.address.toLowerCase(),
        type: nodeType,
        label: n.label || n.entityName || (n.address.slice(0, 6) + '...' + n.address.slice(-4)),
        address: n.address,
        blockchain: n.blockchain || result.blockchain,
        riskScore,
        balance: `${(n.totalIncoming - n.totalOutgoing).toFixed(2)} ${isBtc ? 'BTC' : 'ETH'}`,
        totalIncomingUsd: incomingUsd,
        totalOutgoingUsd: outgoingUsd,
        metadata: {
          hop: n.hop,
          isTerminal: n.isTerminal,
          entityName: n.entityName,
          entityType: n.entityType,
          attributionConfidence: n.attributionConfidence,
          details: n.isTerminal
            ? `Terminal Hop ${n.hop} Sink: Identified as ${n.entityName || n.type} (${n.attributionConfidence || 95}% attribution confidence).`
            : `Hop ${n.hop} Intermediate Counterparty. Inflow: ${n.totalIncoming} | Outflow: ${n.totalOutgoing}.`,
        },
      });
    }

    for (const e of result.edges) {
      const amountUsd = (e.amount || 0) * unitPriceUsd;
      const isDeposit = e.isExchangeDeposit;
      const edgeType: ForensicEdgeType = isDeposit ? 'DEPOSIT' : 'TRANSFER';

      graph.addEdge({
        id: e.id,
        source: e.source.toLowerCase(),
        target: e.target.toLowerCase(),
        type: edgeType,
        amount: String(e.amount),
        amountUsd,
        asset: e.asset || (isBtc ? 'BTC' : 'ETH'),
        txHash: e.txHash,
        timestamp: e.timestamp,
        blockNumber: 0,
        hopCount: e.hop,
        isSuspicious: isDeposit || e.amount >= 5,
        metadata: {
          hop: e.hop,
          dateTime: e.dateTime,
          isExchangeDeposit: e.isExchangeDeposit,
        },
      });
    }

    return graph;
  }

  // ==========================================================================
  // Algorithm 1: BFS Shortest Path
  // ==========================================================================

  public bfsShortestPath(sourceId: string, targetId: string): ShortestPathResult {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return { path: [], edges: [], distance: -1, totalVolumeUsd: 0, found: false };
    }

    if (sourceId === targetId) {
      return { path: [sourceId], edges: [], distance: 0, totalVolumeUsd: 0, found: true };
    }

    const queue: string[] = [sourceId];
    const visited = new Set<string>([sourceId]);
    const parentMap = new Map<string, { parent: string; edge: GraphEdge }>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === targetId) break;

      const outEdges = this.outgoingEdges.get(current) || [];
      for (const edge of outEdges) {
        const neighbor = edge.target;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parentMap.set(neighbor, { parent: current, edge });
          queue.push(neighbor);
        }
      }
    }

    if (!parentMap.has(targetId)) {
      return { path: [], edges: [], distance: -1, totalVolumeUsd: 0, found: false };
    }

    // Reconstruct path
    const path: string[] = [];
    const edges: GraphEdge[] = [];
    let curr = targetId;
    let totalVolumeUsd = 0;

    while (curr !== sourceId) {
      path.unshift(curr);
      const parentData = parentMap.get(curr)!;
      edges.unshift(parentData.edge);
      totalVolumeUsd += parentData.edge.amountUsd;
      curr = parentData.parent;
    }
    path.unshift(sourceId);

    return {
      path,
      edges,
      distance: edges.length,
      totalVolumeUsd,
      found: true,
    };
  }

  // ==========================================================================
  // Algorithm 2: DFS Graph Traversal (Branch Tracing & Cycle Detection)
  // ==========================================================================

  public dfsTraversal(
    startId: string,
    options: { maxDepth?: number; direction?: 'outgoing' | 'incoming' | 'both' } = {}
  ): DfsTraversalResult {
    const maxDepth = options.maxDepth ?? 10;
    const direction = options.direction ?? 'outgoing';

    const visitedOrder: string[] = [];
    const discoveredPaths: string[][] = [];
    const globalVisited = new Set<string>();
    let maxDepthReached = 0;
    let cycleDetected = false;

    if (!this.nodes.has(startId)) {
      return { visitedOrder: [], paths: [], maxDepthReached: 0, cycleDetected: false };
    }

    const dfs = (nodeId: string, currentPath: string[], currentDepth: number, recursionStack: Set<string>) => {
      visitedOrder.push(nodeId);
      globalVisited.add(nodeId);
      recursionStack.add(nodeId);
      maxDepthReached = Math.max(maxDepthReached, currentDepth);

      const pathSoFar = [...currentPath, nodeId];
      const neighbors = this.getNeighborsByDirection(nodeId, direction);

      let isLeaf = true;

      if (currentDepth < maxDepth) {
        for (const neighbor of neighbors) {
          if (recursionStack.has(neighbor)) {
            cycleDetected = true; // Loop or peeling cycle found
          }

          if (!recursionStack.has(neighbor)) {
            isLeaf = false;
            dfs(neighbor, pathSoFar, currentDepth + 1, recursionStack);
          }
        }
      }

      if (isLeaf && pathSoFar.length > 1) {
        discoveredPaths.push(pathSoFar);
      }

      recursionStack.delete(nodeId);
    };

    dfs(startId, [], 0, new Set());

    return {
      visitedOrder,
      paths: discoveredPaths,
      maxDepthReached,
      cycleDetected,
    };
  }

  // ==========================================================================
  // Algorithm 3: Configurable Maximum Hops Subgraph Extraction
  // ==========================================================================

  public extractSubGraphByHops(
    centerNodeId: string,
    maxHops: number = 2,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): DirectedForensicGraph {
    const subGraph = new DirectedForensicGraph();
    if (!this.nodes.has(centerNodeId)) return subGraph;

    // Add center node
    subGraph.addNode(this.nodes.get(centerNodeId)!);

    // BFS queue tracking { nodeId, currentHop }
    const queue: Array<{ id: string; hop: number }> = [{ id: centerNodeId, hop: 0 }];
    const visitedHops = new Map<string, number>([[centerNodeId, 0]]);

    while (queue.length > 0) {
      const { id, hop } = queue.shift()!;
      if (hop >= maxHops) continue;

      // 1. Outgoing edges
      if (direction === 'outgoing' || direction === 'both') {
        for (const edge of this.outgoingEdges.get(id) || []) {
          subGraph.addNode(this.nodes.get(edge.target)!);
          subGraph.addEdge(edge);

          if (!visitedHops.has(edge.target) || visitedHops.get(edge.target)! > hop + 1) {
            visitedHops.set(edge.target, hop + 1);
            queue.push({ id: edge.target, hop: hop + 1 });
          }
        }
      }

      // 2. Incoming edges
      if (direction === 'incoming' || direction === 'both') {
        for (const edge of this.incomingEdges.get(id) || []) {
          subGraph.addNode(this.nodes.get(edge.source)!);
          subGraph.addEdge(edge);

          if (!visitedHops.has(edge.source) || visitedHops.get(edge.source)! > hop + 1) {
            visitedHops.set(edge.source, hop + 1);
            queue.push({ id: edge.source, hop: hop + 1 });
          }
        }
      }
    }

    return subGraph;
  }

  // ==========================================================================
  // Algorithm 4: Connected Component Analysis
  // ==========================================================================

  public findConnectedComponents(): ConnectedComponent[] {
    const visited = new Set<string>();
    const components: ConnectedComponent[] = [];
    let counter = 1;

    for (const nodeId of this.nodes.keys()) {
      if (visited.has(nodeId)) continue;

      const compNodes: GraphNode[] = [];
      const compNodeIds = new Set<string>();
      const compEdges: GraphEdge[] = [];
      let totalVolumeUsd = 0;
      let hasSuspectOrMixer = false;

      // BFS on undirected view
      const queue: string[] = [nodeId];
      visited.add(nodeId);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const node = this.nodes.get(curr)!;
        compNodes.push(node);
        compNodeIds.add(curr);

        if (node.type === 'Suspect' || node.type === 'Mixer' || (node.riskScore || 0) > 85) {
          hasSuspectOrMixer = true;
        }

        // Neighbors in both directions
        const neighbors = new Set<string>([
          ...(this.outgoingNeighbors.get(curr) || []),
          ...(this.incomingNeighbors.get(curr) || []),
        ]);

        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      // Collect component edges
      for (const edge of this.edges.values()) {
        if (compNodeIds.has(edge.source) && compNodeIds.has(edge.target)) {
          compEdges.push(edge);
          totalVolumeUsd += edge.amountUsd;
        }
      }

      components.push({
        componentId: `CLUSTER-${String(counter++).padStart(3, '0')}`,
        nodes: compNodes,
        edges: compEdges,
        nodeCount: compNodes.length,
        edgeCount: compEdges.length,
        totalVolumeUsd,
        hasSuspectOrMixer,
      });
    }

    // Sort by largest volume first
    return components.sort((a, b) => b.totalVolumeUsd - a.totalVolumeUsd);
  }

  // ==========================================================================
  // Algorithm 5: Intermediary & Mule Detection
  // ==========================================================================

  public detectIntermediaries(): IntermediaryNode[] {
    const intermediaries: IntermediaryNode[] = [];

    for (const [id, node] of this.nodes.entries()) {
      const inEdges = this.incomingEdges.get(id) || [];
      const outEdges = this.outgoingEdges.get(id) || [];

      // Intermediaries must have both in-flow and out-flow
      if (inEdges.length === 0 || outEdges.length === 0) continue;

      const totalReceivedUsd = inEdges.reduce((acc, e) => acc + e.amountUsd, 0);
      const totalForwardedUsd = outEdges.reduce((acc, e) => acc + e.amountUsd, 0);

      // Retention rate: % of funds kept in wallet
      const retentionRate = totalReceivedUsd > 0
        ? Math.max(0, (totalReceivedUsd - totalForwardedUsd) / totalReceivedUsd)
        : 1.0;

      // Average holding time between earliest in-flow and latest out-flow
      const earliestIn = Math.min(...inEdges.map(e => e.timestamp));
      const earliestOut = Math.min(...outEdges.map(e => e.timestamp));
      const velocityHours = Math.max(0, (earliestOut - earliestIn) / 3600);

      // Betweenness score heuristic: product of in-degree and out-degree
      const betweennessScore = inEdges.length * outEdges.length;

      let classification: IntermediaryNode['classification'] = 'MULE_RELAY';
      if (inEdges.length === 1 && outEdges.length >= 2) {
        classification = 'PEELING_CHAIN_HOP';
      } else if (inEdges.length >= 3 && outEdges.length <= 2) {
        classification = 'AGGREGATOR';
      } else if (inEdges.length <= 2 && outEdges.length >= 3) {
        classification = 'DISPERSER';
      }

      intermediaries.push({
        node,
        inDegree: inEdges.length,
        outDegree: outEdges.length,
        totalReceivedUsd,
        totalForwardedUsd,
        retentionRate: Math.round(retentionRate * 1000) / 10,
        velocityHours: Math.round(velocityHours * 10) / 10,
        betweennessScore,
        classification,
      });
    }

    // Sort by most active intermediaries (betweenness * volume)
    return intermediaries.sort((a, b) => b.totalForwardedUsd - a.totalForwardedUsd);
  }

  // ==========================================================================
  // Algorithm 6: Transaction Timeline
  // ==========================================================================

  public getTransactionTimeline(filter?: { asset?: string; minAmountUsd?: number }): TimelineItem[] {
    const edgesList = Array.from(this.edges.values());

    const filtered = edgesList.filter(e => {
      if (filter?.asset && e.asset !== filter.asset) return false;
      if (filter?.minAmountUsd && e.amountUsd < filter.minAmountUsd) return false;
      return true;
    });

    // Chronological sort
    filtered.sort((a, b) => a.timestamp - b.timestamp);

    // Track hop counts relative to initial root transactions
    const hopMap = new Map<string, number>();

    return filtered.map((e): TimelineItem => {
      const parentHop = hopMap.get(e.source) || 0;
      const currentHop = parentHop + 1;
      hopMap.set(e.target, Math.max(hopMap.get(e.target) || 0, currentHop));

      const sourceNode = this.nodes.get(e.source);
      const targetNode = this.nodes.get(e.target);

      return {
        txHash: e.txHash,
        sourceId: e.source,
        sourceLabel: sourceNode?.label || this.truncateAddress(e.source),
        targetId: e.target,
        targetLabel: targetNode?.label || this.truncateAddress(e.target),
        type: e.type,
        asset: e.asset,
        amount: e.amount,
        amountUsd: e.amountUsd,
        timestamp: e.timestamp,
        dateTime: new Date(e.timestamp * 1000).toISOString(),
        blockNumber: e.blockNumber,
        hopNumber: currentHop,
      };
    });
  }

  // ==========================================================================
  // Algorithm 7: Fund-Flow Aggregation
  // ==========================================================================

  public aggregateFundFlows(): { totalVolumeUsd: number; aggregatedEdges: AggregatedFlowEdge[] } {
    const pairMap = new Map<string, AggregatedFlowEdge>();
    let totalVolumeUsd = 0;

    for (const edge of this.edges.values()) {
      totalVolumeUsd += edge.amountUsd;
      const key = `${edge.source}->${edge.target}:${edge.asset}`;

      if (!pairMap.has(key)) {
        pairMap.set(key, {
          id: `agg_${edge.source.slice(0, 6)}_${edge.target.slice(0, 6)}_${edge.asset}`,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          asset: edge.asset,
          totalAmount: edge.amount,
          totalAmountUsd: edge.amountUsd,
          txCount: 1,
          txHashes: [edge.txHash],
          firstSeen: edge.timestamp,
          lastSeen: edge.timestamp,
        });
      } else {
        const existing = pairMap.get(key)!;
        existing.totalAmountUsd += edge.amountUsd;
        existing.totalAmount = (parseFloat(existing.totalAmount) + parseFloat(edge.amount)).toFixed(4);
        existing.txCount += 1;
        if (!existing.txHashes.includes(edge.txHash)) existing.txHashes.push(edge.txHash);
        existing.firstSeen = Math.min(existing.firstSeen, edge.timestamp);
        existing.lastSeen = Math.max(existing.lastSeen, edge.timestamp);
      }
    }

    return {
      totalVolumeUsd,
      aggregatedEdges: Array.from(pairMap.values()).sort((a, b) => b.totalAmountUsd - a.totalAmountUsd),
    };
  }

  // ==========================================================================
  // Direct Output: React Flow (@xyflow/react)
  // ==========================================================================

  public toReactFlow(options: { horizontalSpacing?: number; verticalSpacing?: number } = {}): ReactFlowGraphData {
    const hSpacing = options.horizontalSpacing ?? 340;
    const vSpacing = options.verticalSpacing ?? 170;

    // 1. Calculate topological layer / hop levels from sources for visual layout
    const levels = new Map<string, number>();
    const inDegrees = new Map<string, number>();

    for (const nodeId of this.nodes.keys()) {
      inDegrees.set(nodeId, (this.incomingEdges.get(nodeId) || []).length);
    }

    // Roots have 0 in-degree
    const queue: string[] = [];
    for (const [nodeId, deg] of inDegrees.entries()) {
      if (deg === 0) {
        levels.set(nodeId, 0);
        queue.push(nodeId);
      }
    }

    // If cycle or no clear root, start with node 0
    if (queue.length === 0 && this.nodes.size > 0) {
      const first = this.nodes.keys().next().value!;
      levels.set(first, 0);
      queue.push(first);
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLevel = levels.get(curr) || 0;

      for (const neighbor of this.outgoingNeighbors.get(curr) || []) {
        if (!levels.has(neighbor) || levels.get(neighbor)! < currLevel + 1) {
          levels.set(neighbor, currLevel + 1);
          queue.push(neighbor);
        }
      }
    }

    // Any orphaned nodes
    for (const nodeId of this.nodes.keys()) {
      if (!levels.has(nodeId)) {
        levels.set(nodeId, 0);
      }
    }

    // Group nodes by levels
    const maxLevel = Math.max(...Array.from(levels.values()), 0);
    const levelBuckets = new Map<number, string[]>();
    for (let l = 0; l <= maxLevel; l++) {
      levelBuckets.set(l, []);
    }
    for (const [nodeId, level] of levels.entries()) {
      levelBuckets.get(level)!.push(nodeId);
    }

    // 2. Build anti-collision node coordinates with barycentric vertical alignment
    const positions = new Map<string, { x: number; y: number }>();
    const baselineCenterY = 240;

    for (let l = 0; l <= maxLevel; l++) {
      const nodeIds = levelBuckets.get(l) || [];
      if (nodeIds.length === 0) continue;

      const xPos = 60 + l * hSpacing;

      if (l === 0) {
        // Center root nodes vertically around baselineCenterY
        const totalHeight = (nodeIds.length - 1) * vSpacing;
        const startY = baselineCenterY - totalHeight / 2;
        nodeIds.forEach((nodeId, idx) => {
          positions.set(nodeId, { x: xPos, y: Math.round(startY + idx * vSpacing) });
        });
      } else {
        // Calculate ideal Y from parent nodes to preserve flow lanes and avoid edge crossing
        const scored = nodeIds.map((nodeId) => {
          const inNeighbors = Array.from(this.incomingNeighbors.get(nodeId) || []);
          const knownParents = inNeighbors.filter((p: string) => positions.has(p));
          let idealY = baselineCenterY;
          if (knownParents.length > 0) {
            const sum = knownParents.reduce((acc: number, p: string) => acc + positions.get(p)!.y, 0);
            idealY = sum / knownParents.length;
          }
          return { nodeId, idealY };
        });

        // Sort by idealY to preserve flow tracks
        scored.sort((a, b) => a.idealY - b.idealY);

        if (scored.length === 1) {
          positions.set(scored[0].nodeId, { x: xPos, y: Math.round(scored[0].idealY) });
        } else {
          // Multiple nodes in this layer: enforce minimum vertical separation
          const assignedYs = scored.map((s) => s.idealY);
          for (let i = 1; i < assignedYs.length; i++) {
            if (assignedYs[i] < assignedYs[i - 1] + vSpacing) {
              assignedYs[i] = assignedYs[i - 1] + vSpacing;
            }
          }

          // Balance around the average ideal center
          const avgIdeal = scored.reduce((acc, s) => acc + s.idealY, 0) / scored.length;
          const avgAssigned = assignedYs.reduce((acc, y) => acc + y, 0) / assignedYs.length;
          const shift = avgIdeal - avgAssigned;

          scored.forEach((item, idx) => {
            positions.set(item.nodeId, { x: xPos, y: Math.round(assignedYs[idx] + shift) });
          });
        }
      }
    }

    // Build React Flow Nodes
    const rfNodes: ReactFlowNode[] = [];
    for (const [nodeId, pos] of positions.entries()) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;

      rfNodes.push({
        id: node.id,
        type: 'forensicNode',
        position: pos,
        data: {
          label: node.label,
          address: node.address,
          category: node.type,
          type: node.type.toLowerCase(),
          icon: this.getNodeIcon(node.type),
          riskScore: node.riskScore ? `${node.riskScore}/100` : '50/100',
          balance: node.balance || `${(node.totalIncomingUsd - node.totalOutgoingUsd).toFixed(2)} USD`,
          totalIncomingUsd: node.totalIncomingUsd,
          totalOutgoingUsd: node.totalOutgoingUsd,
          blockchain: node.blockchain,
          metadata: node.metadata,
        },
      });
    }

    // 3. Build React Flow Edges with clear badge styling to prevent label overlapping
    const rfEdges: ReactFlowEdge[] = [];
    for (const edge of this.edges.values()) {
      const color = this.getEdgeColor(edge.type);

      const formattedUsd =
        edge.amountUsd >= 1000000
          ? `$${(edge.amountUsd / 1000000).toFixed(1)}M`
          : edge.amountUsd >= 1000
          ? `$${(edge.amountUsd / 1000).toFixed(0)}K`
          : `$${edge.amountUsd}`;

      rfEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: edge.isSuspicious || edge.type === 'MIXER' as any,
        label: `${edge.amount} ${edge.asset} (${formattedUsd})`,
        labelStyle: {
          fill: '#f1f5f9',
          fontWeight: 600,
          fontSize: 10,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        },
        labelBgStyle: {
          fill: '#0d1117',
          fillOpacity: 0.94,
          stroke: color,
          strokeWidth: 1,
          rx: 4,
          ry: 4,
        },
        labelBgPadding: [6, 3] as [number, number],
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 16,
          height: 16,
        },
        style: {
          stroke: color,
          strokeWidth: edge.amountUsd > 100000 ? 2.5 : 1.8,
        },
        data: {
          txHash: edge.txHash,
          type: edge.type,
          amountUsd: edge.amountUsd,
          asset: edge.asset,
          timestamp: edge.timestamp,
        },
      });
    }

    return { nodes: rfNodes, edges: rfEdges };
  }

  // ==========================================================================
  // Direct Output: Cytoscape.js
  // ==========================================================================

  public toCytoscape(): CytoscapeGraphData {
    const elements: CytoscapeElement[] = [];

    // Cytoscape Nodes
    for (const node of this.nodes.values()) {
      elements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label,
          address: node.address,
          type: node.type,
          riskScore: node.riskScore || 0,
          totalIncomingUsd: node.totalIncomingUsd,
          totalOutgoingUsd: node.totalOutgoingUsd,
          blockchain: node.blockchain,
        },
        classes: `node-${node.type.toLowerCase().replace(/\s+/g, '-')}`,
      });
    }

    // Cytoscape Edges
    for (const edge of this.edges.values()) {
      elements.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: `${edge.amount} ${edge.asset}`,
          type: edge.type,
          amount: edge.amount,
          amountUsd: edge.amountUsd,
          txHash: edge.txHash,
          timestamp: edge.timestamp,
        },
        classes: `edge-${edge.type.toLowerCase()}`,
      });
    }

    return { elements };
  }

  // ==========================================================================
  // Private Utilities
  // ==========================================================================

  private getNeighborsByDirection(nodeId: string, direction: 'outgoing' | 'incoming' | 'both'): string[] {
    if (direction === 'outgoing') {
      return Array.from(this.outgoingNeighbors.get(nodeId) || []);
    }
    if (direction === 'incoming') {
      return Array.from(this.incomingNeighbors.get(nodeId) || []);
    }
    const combined = new Set<string>([
      ...(this.outgoingNeighbors.get(nodeId) || []),
      ...(this.incomingNeighbors.get(nodeId) || []),
    ]);
    return Array.from(combined);
  }

  private truncateAddress(addr: string): string {
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  private getNodeIcon(type: ForensicNodeType): string {
    switch (type) {
      case 'Victim': return 'shield_person';
      case 'Suspect': return 'warning';
      case 'Exchange': return 'account_balance';
      case 'VASP': return 'business_center';
      case 'DEX': return 'currency_exchange';
      case 'Bridge': return 'multiple_stop';
      case 'Mixer': return 'blender';
      case 'Smart Contract': return 'code_blocks';
      default: return 'account_balance_wallet';
    }
  }

  private getEdgeColor(type: ForensicEdgeType): string {
    switch (type) {
      case 'DEPOSIT': return '#f97316'; // Orange
      case 'WITHDRAWAL': return '#22c55e'; // Green
      case 'SWAP': return '#a855f7'; // Purple
      case 'BRIDGE': return '#06b6d4'; // Cyan
      case 'CONTRACT_INTERACTION': return '#eab308'; // Yellow
      case 'TRANSFER':
      default:
        return '#3f90ff'; // Primary Blue
    }
  }
}
