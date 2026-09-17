/**
 * CryptoTrace Intelligence — Forensic Graph Engine Types
 * 
 * Defines standard Nodes and Edges for blockchain fund-flow directed graphs,
 * supporting advanced graph algorithms and export to React Flow / Cytoscape.
 */

import { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';

// ============================================================================
// Forensic Node & Edge Classification
// ============================================================================

export type ForensicNodeType = 
  | 'Wallet'
  | 'Victim'
  | 'Suspect'
  | 'Exchange'
  | 'VASP'
  | 'DEX'
  | 'Bridge'
  | 'Mixer'
  | 'Smart Contract';

export type ForensicEdgeType = 
  | 'TRANSFER'
  | 'SWAP'
  | 'BRIDGE'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'CONTRACT_INTERACTION';

// ============================================================================
// Graph Data Model
// ============================================================================

export interface GraphNode {
  id: string; // Unique address or entity ID
  type: ForensicNodeType;
  label: string;
  address: string;
  blockchain: string;
  category?: string;
  riskScore?: number; // 0 - 100
  balance?: string;
  totalIncomingUsd: number;
  totalOutgoingUsd: number;
  firstSeen?: number; // Unix timestamp
  lastSeen?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string; // source node ID
  target: string; // target node ID
  type: ForensicEdgeType;
  amount: string; // Decimal amount
  amountUsd: number;
  asset: string;
  txHash: string;
  timestamp: number; // Unix timestamp
  blockNumber: number;
  isSuspicious?: boolean;
  hopCount?: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Algorithm Results
// ============================================================================

export interface ShortestPathResult {
  path: string[]; // Ordered list of node IDs from source to target
  edges: GraphEdge[]; // Ordered list of traversing edges
  distance: number; // Number of hops
  totalVolumeUsd: number;
  found: boolean;
}

export interface DfsTraversalResult {
  visitedOrder: string[]; // Order of visited node IDs
  paths: string[][]; // Discovered root-to-leaf paths
  maxDepthReached: number;
  cycleDetected: boolean;
}

export interface ConnectedComponent {
  componentId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeCount: number;
  edgeCount: number;
  totalVolumeUsd: number;
  hasSuspectOrMixer: boolean;
}

export interface IntermediaryNode {
  node: GraphNode;
  inDegree: number;
  outDegree: number;
  totalReceivedUsd: number;
  totalForwardedUsd: number;
  retentionRate: number; // Percentage of funds retained (low retention = high probability pass-through mule)
  velocityHours: number; // Average holding time before forwarding
  betweennessScore: number;
  classification: 'MULE_RELAY' | 'PEELING_CHAIN_HOP' | 'AGGREGATOR' | 'DISPERSER';
}

export interface TimelineItem {
  txHash: string;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  type: ForensicEdgeType;
  asset: string;
  amount: string;
  amountUsd: number;
  timestamp: number;
  dateTime: string;
  blockNumber: number;
  hopNumber: number;
}

export interface AggregatedFlowEdge {
  id: string;
  source: string;
  target: string;
  type: ForensicEdgeType;
  asset: string;
  totalAmount: string;
  totalAmountUsd: number;
  txCount: number;
  txHashes: string[];
  firstSeen: number;
  lastSeen: number;
}

// ============================================================================
// React Flow & Cytoscape Export Formats
// ============================================================================

export interface ReactFlowGraphData {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface CytoscapeElement {
  group: 'nodes' | 'edges';
  data: {
    id: string;
    source?: string;
    target?: string;
    label?: string;
    type?: string;
    amount?: string;
    amountUsd?: number;
    riskScore?: number;
    [key: string]: unknown;
  };
  position?: { x: number; y: number };
  classes?: string;
}

export interface CytoscapeGraphData {
  elements: CytoscapeElement[];
}
