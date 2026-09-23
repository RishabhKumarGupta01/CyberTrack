import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DirectedForensicGraph } from '../graph/DirectedForensicGraph';
import { ForensicNodeType, ForensicEdgeType, GraphNode } from '../graph/types';
import { entityIntelligence } from '../attribution/EntityIntelligenceLayer';
import { blockchainRegistry, AdapterTransaction, AdapterBalance } from '../blockchain';
import { TransactionNormalizer } from '../blockchain/normalization/TransactionNormalizer';
import { NormalizedTransaction } from '../blockchain/normalization/types';
import { SupabaseService } from '../services/supabaseService';
import { apiClient, CrawlerTraceResult, IdentifiedEndpoint, TracedPath } from '../services/api';
import { Case } from '../types';

// Custom Forensic Node Component supporting all 9 Node Types with anti-collision fixed dimensions
const ForensicNode = ({ data }: any) => {
  const getNodeStyles = () => {
    switch (data.type?.toLowerCase()) {
      case 'victim':
        return 'border-primary bg-primary/10 text-primary shadow-primary/20';
      case 'suspect':
        return 'border-error bg-error/10 text-error shadow-error/20';
      case 'mixer':
        return 'border-tertiary bg-tertiary/10 text-tertiary shadow-tertiary/20';
      case 'bridge':
        return 'border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-cyan-400/20';
      case 'dex':
        return 'border-purple-400 bg-purple-400/10 text-purple-300 shadow-purple-400/20';
      case 'exchange':
      case 'vasp':
        return 'border-amber-400 bg-amber-400/10 text-amber-300 shadow-amber-400/20';
      case 'smart contract':
        return 'border-emerald-400 bg-emerald-400/10 text-emerald-300 shadow-emerald-400/20';
      case 'wallet':
      default:
        return 'border-outline bg-surface-container text-on-surface';
    }
  };

  const riskNum = parseInt(String(data.riskScore || '0').split('/')[0], 10);

  return (
    <div className={`w-[220px] p-2.5 rounded-lg border-2 shadow-lg backdrop-blur-md ${getNodeStyles()} transition-all cursor-pointer select-none hover:scale-[1.02] hover:shadow-xl`}>
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-primary border-2 !border-background -left-1.5"
      />
      <div className="flex items-center gap-1.5 mb-1">
        <span className="material-symbols-outlined text-[15px]">{data.icon || 'account_balance_wallet'}</span>
        <span className="text-[10px] font-sans font-bold uppercase tracking-wider truncate flex-1">{data.category || data.type}</span>
        {data.riskScore !== undefined && (
          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
            riskNum >= 80 ? 'bg-error/20 text-error' :
            riskNum >= 50 ? 'bg-amber-400/20 text-amber-300' :
            'bg-primary/20 text-primary'
          }`}>
            {data.riskScore}
          </span>
        )}
      </div>
      <div className="text-xs font-semibold text-on-surface truncate" title={data.label}>{data.label}</div>
      <div className="text-[10px] font-mono text-outline truncate mt-0.5" title={data.address}>{data.address}</div>
      <div className="text-[10px] text-on-surface-variant font-mono mt-1.5 pt-1 border-t border-outline-variant/30 flex justify-between items-center">
        <span className="text-outline text-[9px] uppercase">Flow Vol:</span>
        <span className="font-semibold text-on-surface">{data.balance || '$0'}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-primary border-2 !border-background -right-1.5"
      />
    </div>
  );
};

const nodeTypes = {
  forensicNode: ForensicNode,
};

// Explorer URL Resolvers
function getExplorerAddressUrl(chain: string, address: string): string {
  const c = (chain || '').toLowerCase();
  if (c.includes('btc') || c.includes('bitcoin')) return `https://mempool.space/address/${address}`;
  if (c.includes('sol')) return `https://solscan.io/account/${address}`;
  if (c.includes('tron')) return `https://tronscan.org/#/address/${address}`;
  if (c.includes('avax') || c.includes('avalanche')) return `https://snowtrace.io/address/${address}`;
  return `https://etherscan.io/address/${address}`;
}

function getExplorerTxUrl(chain: string, txHash: string): string {
  const c = (chain || '').toLowerCase();
  if (c.includes('btc') || c.includes('bitcoin')) return `https://mempool.space/tx/${txHash}`;
  if (c.includes('sol')) return `https://solscan.io/tx/${txHash}`;
  if (c.includes('tron')) return `https://tronscan.org/#/transaction/${txHash}`;
  if (c.includes('avax') || c.includes('avalanche')) return `https://snowtrace.io/tx/${txHash}`;
  return `https://etherscan.io/tx/${txHash}`;
}

// Build an authentic target node when live on-chain transactions are 0
function buildEmptyTargetGraph(targetAddr: string, chain: string, caseData?: Case | null, bal?: AdapterBalance | null): DirectedForensicGraph {
  const g = new DirectedForensicGraph();
  const caseId = caseData?.caseId || '';

  g.addNode({
    id: targetAddr.toLowerCase(),
    type: 'Suspect',
    label: caseId ? `${caseId} Target` : `Target (${targetAddr.slice(0, 6)}...${targetAddr.slice(-4)})`,
    address: targetAddr,
    blockchain: chain,
    riskScore: 0,
    balance: bal ? `${bal.balance} ${bal.assetSymbol}` : '$0.00',
    totalIncomingUsd: 0,
    totalOutgoingUsd: 0,
    metadata: { details: `Monitored address. 0 confirmed on-chain transactions found on ${chain} network. Surveillance listening.` },
  });

  return g;
}

export const TransactionGraph: React.FC = () => {
  const { caseId: routeParam } = useParams<{ caseId?: string }>();
  const navigate = useNavigate();

  // Search and Case Selection State
  const [searchInput, setSearchInput] = useState('');
  const [activeCases, setActiveCases] = useState<Case[]>([]);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [activeAddress, setActiveAddress] = useState<string>('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
  const [detectedChain, setDetectedChain] = useState<string>('Ethereum');
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(true);
  const [isLiveLedger, setIsLiveLedger] = useState<boolean>(false);
  const [liveTxCount, setLiveTxCount] = useState<number>(0);

  // Graph state
  const [masterGraph, setMasterGraph] = useState<DirectedForensicGraph>(() => new DirectedForensicGraph());
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [activePathInfo, setActivePathInfo] = useState<string | null>(null);

  // Automated Recursive Multi-Hop BFS Crawler State
  const [isCrawling, setIsCrawling] = useState<boolean>(false);
  const [crawlerResult, setCrawlerResult] = useState<CrawlerTraceResult | null>(null);
  const [crawlerDepth, setCrawlerDepth] = useState<number>(3);
  const [crawlerMinVolume, setCrawlerMinVolume] = useState<number>(0.05);
  const [crawlerStopOnExchange, setCrawlerStopOnExchange] = useState<boolean>(true);
  const [crawlerCrossChain, setCrawlerCrossChain] = useState<boolean>(false);
  const [crawlerError, setCrawlerError] = useState<string | null>(null);
  const [showCrawlerModal, setShowCrawlerModal] = useState<boolean>(false);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(null);

  // Navigation tabs and layout state
  const [activeTab, setActiveTab] = useState<'canvas' | 'timeline' | 'intermediaries'>('canvas');
  const [traceHops, setTraceHops] = useState(5);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // 1. Fetch available cases on mount from Supabase / API gateway
  useEffect(() => {
    let isMounted = true;
    const fetchCases = async () => {
      try {
        const list = await SupabaseService.getCases();
        if (isMounted && list && list.length > 0) {
          setActiveCases(list);
        }
      } catch (err) {
        console.warn('Failed to load cases in graph:', err);
      }
    };
    fetchCases();
    return () => { isMounted = false; };
  }, []);

  // 2. Resolve Target Address and Case from Route Parameter
  useEffect(() => {
    let isMounted = true;
    const resolveParam = async () => {
      const param = routeParam?.trim();

      if (!param) {
        // Default target
        setActiveAddress('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
        setSearchInput('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
        return;
      }

      setSearchInput(param);

      // Check if param is an address format (0x..., bc1..., T..., or Base58)
      const isAddress = /^0x[a-fA-F0-9]{40}$/.test(param) ||
        /^(bc1[a-z0-9]{38,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/i.test(param) ||
        /^T[a-zA-Z0-9]{33}$/.test(param) ||
        /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(param);

      if (isAddress) {
        setActiveAddress(param);
        setCurrentCase(null);
        return;
      }

      // Otherwise treat as Case ID (e.g. INV-2023-0842)
      let foundCase = activeCases.find(c => c.caseId.toLowerCase() === param.toLowerCase());
      if (!foundCase) {
        try {
          const freshCases = await SupabaseService.getCases();
          foundCase = freshCases.find(c => c.caseId.toLowerCase() === param.toLowerCase());
        } catch {
          // ignore
        }
      }

      if (isMounted) {
        if (foundCase) {
          setCurrentCase(foundCase);
          setActiveAddress(foundCase.targetAddress || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
        } else {
          setActiveAddress(param);
        }
      }
    };

    resolveParam();
    return () => { isMounted = false; };
  }, [routeParam, activeCases]);

  // 3. Build Real / Dynamic Forensic Graph whenever activeAddress changes
  useEffect(() => {
    let isMounted = true;

    const buildGraph = async () => {
      setIsLoadingGraph(true);
      setActivePathInfo(null);

      try {
        const cleanAddr = activeAddress.trim();
        const adapter = blockchainRegistry.detectAdapterForAddress(cleanAddr, currentCase?.network) || blockchainRegistry.get('Ethereum');
        
        if (isMounted) {
          setDetectedChain(adapter.blockchain);
        }

        // Fetch balance and transactions in parallel
        const [bal, liveTxsRaw] = await Promise.all([
          adapter.get_balance(cleanAddr).catch(() => null),
          adapter.get_transactions(cleanAddr, { limit: 20 }).catch(() => []),
        ]);

        let allTxs: AdapterTransaction[] = [...liveTxsRaw];

        // Also fetch token transfers if supported (e.g. ERC-20 on Ethereum)
        if (adapter.blockchain === 'Ethereum' || adapter.blockchain === 'Avalanche') {
          try {
            const tokenTxs = await (adapter as any).get_token_transfers(cleanAddr, { limit: 20 });
            if (tokenTxs && Array.isArray(tokenTxs) && tokenTxs.length > 0) {
              const mapped: AdapterTransaction[] = tokenTxs.map((t: any) => ({
                hash: t.hash,
                blockchain: adapter.blockchain,
                blockNumber: t.blockNumber || 0,
                timestamp: t.timestamp || Math.floor(Date.now() / 1000),
                dateTime: t.dateTime || new Date().toISOString(),
                from: t.from,
                to: t.to,
                value: t.value,
                valueRaw: t.valueRaw,
                assetSymbol: t.tokenSymbol || 'TOKEN',
                fee: '0',
                status: 'confirmed',
                isContractInteraction: true,
              }));
              allTxs = [...allTxs, ...mapped];
            }
          } catch {
            // ignore token transfer errors
          }
        }

        // Deduplicate transactions by hash + from + to
        const seen = new Set<string>();
        const uniqueTxs = allTxs.filter(t => {
          const key = `${t.hash}_${t.from?.toLowerCase()}_${t.to?.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        let graph: DirectedForensicGraph;
        let isLive = false;

        if (uniqueTxs.length > 0) {
          // Normalize transactions
          const normalized = uniqueTxs.map(tx => TransactionNormalizer.fromAdapterTransaction(tx, {
            usdRate: tx.assetSymbol === 'USDT' || tx.assetSymbol === 'USDC' ? 1 : 3200,
          }));

          // Attribute known entities for counterparties
          const entityDirectory = new Map<string, { type: ForensicNodeType; label: string; riskScore?: number }>();
          
          for (const tx of uniqueTxs) {
            const addrs = [tx.from, tx.to].filter(Boolean);
            for (const addr of addrs) {
              const lower = addr.toLowerCase();
              if (lower === cleanAddr.toLowerCase()) {
                entityDirectory.set(lower, {
                  type: 'Suspect',
                  label: currentCase?.caseId ? `${currentCase.caseId} Target` : `Target (${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)})`,
                  riskScore: 88,
                });
                continue;
              }

              const attr = entityIntelligence.attributeAddress(addr, { chain: adapter.blockchain as any });
              if (attr && attr.entity) {
                let nodeType: ForensicNodeType = 'Wallet';
                const et = attr.entity.entityType.toLowerCase();
                if (et.includes('exchange')) nodeType = 'Exchange';
                else if (et.includes('mixer')) nodeType = 'Mixer';
                else if (et.includes('dex')) nodeType = 'DEX';
                else if (et.includes('bridge')) nodeType = 'Bridge';
                
                const isRisky = et.includes('mixer') || et.includes('sanction') || et.includes('high-risk');
                entityDirectory.set(lower, {
                  type: nodeType,
                  label: attr.entity.entityName,
                  riskScore: isRisky ? 99 : et.includes('exchange') ? 45 : 25,
                });
              }
            }
          }

          graph = DirectedForensicGraph.fromTransactions(normalized, entityDirectory);

          // Guarantee the target address exists in graph with its real balance
          const targetNode = graph.getNode(cleanAddr.toLowerCase()) || graph.getNode(cleanAddr);
          if (targetNode) {
            targetNode.balance = bal ? `${bal.balance} ${bal.assetSymbol}` : targetNode.balance;
            targetNode.riskScore = 88;
          } else {
            graph.addNode({
              id: cleanAddr.toLowerCase(),
              type: 'Suspect',
              label: currentCase?.caseId ? `${currentCase.caseId} Target` : `Target (${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)})`,
              address: cleanAddr,
              blockchain: adapter.blockchain,
              riskScore: 88,
              balance: bal ? `${bal.balance} ${bal.assetSymbol}` : '$0',
              totalIncomingUsd: 0,
              totalOutgoingUsd: 0,
              metadata: { details: `Target address under active surveillance.` },
            });
          }

          isLive = true;
        } else {
          // Zero transactions returned from indexer: build genuine empty target node
          graph = buildEmptyTargetGraph(cleanAddr, adapter.blockchain, currentCase, bal);
          isLive = true;
        }

        if (isMounted) {
          setMasterGraph(graph);
          setIsLiveLedger(isLive);
          setLiveTxCount(uniqueTxs.length);

          // Convert to React Flow layout
          const rf = graph.toReactFlow({ horizontalSpacing: 340, verticalSpacing: 170 });
          setNodes(rf.nodes);
          setEdges(rf.edges);

          // Select target node or first node
          const targetReactNode = rf.nodes.find(n => (n.data as any)?.address?.toLowerCase() === cleanAddr.toLowerCase()) || rf.nodes[0];
          setSelectedNode(targetReactNode?.data || null);
        }
      } catch (err) {
        console.warn('Error building dynamic graph:', err);
        if (isMounted) {
          const fallback = buildEmptyTargetGraph(activeAddress, detectedChain, currentCase, null);
          setMasterGraph(fallback);
          const rf = fallback.toReactFlow({ horizontalSpacing: 340, verticalSpacing: 170 });
          setNodes(rf.nodes);
          setEdges(rf.edges);
          setSelectedNode(rf.nodes[0]?.data || null);
          setIsLiveLedger(true);
        }
      } finally {
        if (isMounted) setIsLoadingGraph(false);
      }
    };

    buildGraph();
    return () => { isMounted = false; };
  }, [activeAddress, currentCase]);

  // Dynamic Probable Attribution via Entity Intelligence Layer for the selected node
  const selectedAttribution = useMemo(() => {
    if (!selectedNode?.address) return null;
    return entityIntelligence.attributeAddress(selectedNode.address, {
      chain: (selectedNode.blockchain as any) || detectedChain,
    });
  }, [selectedNode, detectedChain]);

  // Computed graph analytics from active masterGraph
  const components = useMemo(() => masterGraph.findConnectedComponents(), [masterGraph]);
  const intermediaries = useMemo(() => masterGraph.detectIntermediaries(), [masterGraph]);
  const timeline = useMemo(() => masterGraph.getTransactionTimeline(), [masterGraph]);
  const aggregatedFlows = useMemo(() => masterGraph.aggregateFundFlows(), [masterGraph]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data);
  };

  // 1. BFS Shortest Path to VASP
  const handleShortestPath = () => {
    const allNodes = masterGraph.getAllNodes();
    const sourceNode = allNodes.find(n => n.type === 'Victim') || allNodes[0];
    const targetNode = allNodes.find(n => n.type === 'Exchange' || n.type === 'VASP' || n.type === 'Mixer') || allNodes[allNodes.length - 1];

    if (!sourceNode || !targetNode) return;

    const shortest = masterGraph.bfsShortestPath(sourceNode.id, targetNode.id);
    if (shortest.found) {
      setActivePathInfo(`Shortest Path: ${shortest.distance} hops ($${shortest.totalVolumeUsd.toLocaleString()} USD volume)`);
      const pathEdgeIds = new Set(shortest.edges.map(e => e.id));

      setEdges((prev) =>
        prev.map((edge) => ({
          ...edge,
          style: pathEdgeIds.has(edge.id)
            ? { stroke: '#fbbf24', strokeWidth: 3.5 }
            : { stroke: '#414753', strokeWidth: 1, opacity: 0.25 },
        }))
      );
    } else {
      setActivePathInfo('No direct path discovered between source and destination sink.');
    }
  };

  // 2. DFS Deep Tracing
  const handleDfsTrace = () => {
    const allNodes = masterGraph.getAllNodes();
    const startNode = allNodes.find(n => n.address?.toLowerCase() === activeAddress.toLowerCase()) || allNodes[0];
    if (!startNode) return;

    const dfs = masterGraph.dfsTraversal(startNode.id, { maxDepth: traceHops });
    setActivePathInfo(`DFS Traced ${dfs.paths.length} laundering pathways (Max depth: ${dfs.maxDepthReached} hops)`);
  };

  // 3. Configurable Maximum Hops Extraction
  const handleHopsChange = (hops: number) => {
    setTraceHops(hops);
    const allNodes = masterGraph.getAllNodes();
    const center = allNodes.find(n => n.address?.toLowerCase() === activeAddress.toLowerCase()) || allNodes[0];
    if (!center) return;

    const sub = masterGraph.extractSubGraphByHops(center.id, hops, 'both');
    const subRf = sub.toReactFlow({ horizontalSpacing: 340, verticalSpacing: 170 });
    setNodes(subRf.nodes);
    setEdges(subRf.edges);
    setActivePathInfo(`Neighborhood filtered to ${hops} maximum hops (${sub.nodeCount()} nodes, ${sub.edgeCount()} edges)`);
  };

  // 4. Automated Recursive Multi-Hop BFS Crawler
  const handleRunCrawler = async () => {
    setIsCrawling(true);
    setCrawlerError(null);
    setSelectedPathIndex(null);

    try {
      const result = await apiClient.runMultiHopTrace({
        startAddress: activeAddress,
        blockchain: detectedChain,
        maxDepth: crawlerDepth,
        minVolume: crawlerMinVolume,
        stopOnExchange: crawlerStopOnExchange,
        crossChain: crawlerCrossChain,
      });

      setCrawlerResult(result);

      // Ingest into forensic graph
      const newGraph = DirectedForensicGraph.fromCrawlerResult(result);
      setMasterGraph(newGraph);

      const rf = newGraph.toReactFlow({ horizontalSpacing: 360, verticalSpacing: 180 });

      // Highlight edges leading to terminal exchange/mixer sinks in amber gold
      const terminalAddresses = new Set(
        result.identifiedEndpoints.map((ep) => ep.address.toLowerCase())
      );

      const enhancedEdges = rf.edges.map((edge) => {
        const isSinkEdge = terminalAddresses.has(edge.target.toLowerCase());
        if (isSinkEdge) {
          return {
            ...edge,
            animated: true,
            style: {
              ...edge.style,
              stroke: '#fbbf24',
              strokeWidth: 3.5,
            },
          };
        }
        return edge;
      });

      setNodes(rf.nodes);
      setEdges(enhancedEdges);

      const sinkCount = result.identifiedEndpoints.length;
      const pathCount = result.paths.length;
      setActivePathInfo(
        `BFS Trace Complete: Traversed ${result.maxDepthReached} hops (${result.totalNodesExplored} nodes, ${result.totalEdgesExplored} edges). Discovered ${sinkCount} VASP/Mixer endpoint${sinkCount === 1 ? '' : 's'} across ${pathCount} laundering path${pathCount === 1 ? '' : 'ways'}.`
      );

      // Select target node or first exchange node
      const firstSink = rf.nodes.find((n) => terminalAddresses.has(n.id.toLowerCase()));
      if (firstSink) {
        setSelectedNode(firstSink.data);
      }
    } catch (err: any) {
      console.error('Crawler trace failed:', err);
      setCrawlerError(err?.message || 'Failed to execute multi-hop recursive trace');
    } finally {
      setIsCrawling(false);
    }
  };

  const handleHighlightPath = (pathObj: TracedPath, index: number) => {
    setSelectedPathIndex(index);
    const pathNodeSet = new Set(pathObj.path.map((addr) => addr.toLowerCase()));

    setEdges((prev) =>
      prev.map((edge) => {
        const isAlongPath =
          pathNodeSet.has(edge.source.toLowerCase()) && pathNodeSet.has(edge.target.toLowerCase());
        return {
          ...edge,
          style: isAlongPath
            ? { stroke: '#fbbf24', strokeWidth: 4, opacity: 1 }
            : { stroke: '#414753', strokeWidth: 1, opacity: 0.2 },
        };
      })
    );

    setActivePathInfo(
      `Focused Pathway #${index + 1}: ${pathObj.pathLabels.join(' ──▶ ')} (${pathObj.totalVolume} ${pathObj.asset})`
    );
  };

  // Reset Graph
  const handleReset = () => {
    const rf = masterGraph.toReactFlow({ horizontalSpacing: 340, verticalSpacing: 170 });
    setNodes(rf.nodes);
    setEdges(rf.edges);
    setActivePathInfo(null);
  };

  // Export JSON
  const handleExportCytoscape = () => {
    const cyData = masterGraph.toCytoscape();
    const blob = new Blob([JSON.stringify(cyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentCase?.caseId || activeAddress}_cytoscape_graph.json`;
    a.click();
  };

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/graph/${searchInput.trim()}`);
  };

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col space-y-2 select-none overflow-hidden">
      {/* Top Search & Case Selector Bar */}
      <div className="surface-level-1 border border-outline-variant/80 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm shrink-0">
        {/* Left: Input for real wallet address or Case ID */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[320px] max-w-xl">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">
              manage_search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Paste Target Wallet (0x..., bc1...) or Case (INV-...)"
              className="w-full input-field rounded px-3 py-1.5 pl-8 text-xs font-mono text-on-surface"
            />
          </div>
          <button
            type="submit"
            disabled={isLoadingGraph}
            className="btn-primary text-xs px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLoadingGraph ? (
              <>
                <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                <span>Tracing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[15px]">radar</span>
                <span>Trace</span>
              </>
            )}
          </button>
        </form>

        {/* Middle: Active Case Pills from Supabase Database */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
          {activeCases.length > 0 && (
            <>
              <span className="text-outline text-[10px] uppercase tracking-wider shrink-0">Active Cases:</span>
              {activeCases.slice(0, 6).map((item) => (
                <button
                  key={item.caseId}
                  type="button"
                  onClick={() => navigate(`/graph/${item.caseId}`)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer truncate max-w-[150px] ${
                    currentCase?.caseId === item.caseId
                      ? 'bg-primary/20 text-primary border-primary font-bold'
                      : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
                  }`}
                  title={`${item.caseId} - ${item.title}`}
                >
                  {item.caseId}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Right: Live Status Badge */}
        <div className="flex items-center gap-2 shrink-0 text-xs">
          {isLiveLedger ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live Ledger: {liveTxCount} On-Chain Txs ({detectedChain})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/15 border border-primary/30 text-primary font-mono text-[11px]">
              <span className="material-symbols-outlined text-[14px]">account_tree</span>
              <span>{currentCase?.title || `Target: ${activeAddress.slice(0, 8)}...`}</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Breadcrumb & Quick Actions Header */}
      <div className="flex items-center justify-between pb-1 border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-sans text-outline uppercase tracking-wider">Forensic Graph</span>
          <span className="text-outline">/</span>
          <span className="font-mono text-primary font-bold">{currentCase?.caseId || 'Ad-Hoc'}</span>
          <span className="text-outline">/</span>
          <span className="font-mono text-on-surface-variant text-[11px] bg-surface-container px-2 py-0.5 rounded border border-outline-variant truncate max-w-[280px]">
            {activeAddress}
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/60">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'canvas' ? 'bg-primary text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">account_tree</span>
            Graph Canvas
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'timeline' ? 'bg-primary text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">schedule</span>
            Timeline ({timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('intermediaries')}
            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'intermediaries' ? 'bg-primary text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">shield_person</span>
            Mules & Relays ({intermediaries.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCytoscape}
            className="btn-secondary text-xs px-2.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
            title="Export Cytoscape.js format JSON"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            Cytoscape JSON
          </button>
          <button
            onClick={() => navigate(`/wallet/${activeAddress}`)}
            className="btn-primary text-xs px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
            Wallet Intelligence
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {activeTab === 'canvas' ? (
        <div className="flex-1 flex gap-3 overflow-hidden min-h-0 relative">
          {/* Left Control Panel (Collapsible) */}
          {showLeftPanel && (
            <div className="w-[280px] shrink-0 surface-level-1 border border-outline-variant rounded-lg p-3.5 flex flex-col justify-between overflow-y-auto space-y-3.5 shadow-sm transition-all">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wide flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[16px]">tune</span>
                    Algorithms & Filters
                  </h3>
                  <button
                    onClick={() => setShowLeftPanel(false)}
                    className="text-outline hover:text-on-surface p-1 rounded hover:bg-surface-container-highest transition-colors cursor-pointer"
                    title="Collapse Panel"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                </div>

                {/* Configurable Maximum Hops */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">Configurable Maximum Hops</span>
                    <span className="font-mono text-primary font-bold">{traceHops} Hops</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={traceHops}
                    onChange={(e) => handleHopsChange(Number(e.target.value))}
                    className="w-full accent-primary h-1 bg-surface-container rounded cursor-pointer"
                  />
                </div>

                {/* Automated Recursive Multi-Hop BFS Crawler Panel */}
                <div className="p-3 rounded-lg bg-gradient-to-b from-primary/10 to-surface-container border border-primary/40 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[17px] text-primary">radar</span>
                      <span className="text-xs font-bold text-on-surface uppercase tracking-wide">BFS Multi-Hop Crawler</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary/20 text-primary border border-primary/30 font-bold">
                      Recursive
                    </span>
                  </div>

                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    Iteratively traverses downstream counterparties until reaching terminal exchange/mixer sinks or leaf nodes.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-sans text-outline uppercase block mb-1">Max Depth (k)</label>
                      <select
                        value={crawlerDepth}
                        onChange={(e) => setCrawlerDepth(Number(e.target.value))}
                        className="w-full bg-surface-container-highest border border-outline-variant rounded px-2 py-1 text-xs font-mono text-on-surface focus:border-primary outline-none cursor-pointer"
                      >
                        <option value={1}>1 Hop (Direct)</option>
                        <option value={2}>2 Hops</option>
                        <option value={3}>3 Hops (Standard)</option>
                        <option value={4}>4 Hops (Deep)</option>
                        <option value={5}>5 Hops (Max)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-sans text-outline uppercase block mb-1">Min Vol ({detectedChain === 'Bitcoin' ? 'BTC' : 'ETH'})</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={crawlerMinVolume}
                        onChange={(e) => setCrawlerMinVolume(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-surface-container-highest border border-outline-variant rounded px-2 py-1 text-xs font-mono text-on-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-[10px] text-on-surface-variant cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={crawlerStopOnExchange}
                        onChange={(e) => setCrawlerStopOnExchange(e.target.checked)}
                        className="accent-primary rounded cursor-pointer"
                      />
                      <span>Stop at VASP / CEX / Mixer sinks</span>
                    </label>

                    <label className="flex items-center gap-2 text-[10px] text-on-surface-variant cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={crawlerCrossChain}
                        onChange={(e) => setCrawlerCrossChain(e.target.checked)}
                        className="accent-primary rounded cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        Cross-Chain Trace
                        <span className="px-1 py-0.5 rounded text-[8px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase">Beta</span>
                      </span>
                    </label>
                  </div>

                  {crawlerError && (
                    <div className="p-2 rounded bg-error/15 border border-error/30 text-error text-[10px] font-mono leading-tight">
                      {crawlerError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRunCrawler}
                    disabled={isCrawling}
                    className="w-full bg-primary hover:bg-primary/90 text-on-primary-container font-semibold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCrawling ? (
                      <>
                        <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                        <span>Traversing Hops (k={crawlerDepth})...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[15px]">travel_explore</span>
                        <span>Run Automated BFS Crawl</span>
                      </>
                    )}
                  </button>

                  {crawlerResult && (
                    <button
                      type="button"
                      onClick={() => setShowCrawlerModal(true)}
                      className="w-full bg-surface-container-highest border border-amber-400/50 hover:border-amber-400 text-amber-300 py-1.5 px-2.5 rounded text-[11px] font-medium flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">account_balance</span>
                        <span>{crawlerResult.identifiedEndpoints.length} Sinks Discovered</span>
                      </span>
                      <span className="text-[10px] underline font-mono">View Findings</span>
                    </button>
                  )}
                </div>

                {/* Graph Algorithms */}
                <div className="space-y-2 pt-2 border-t border-outline-variant/40">
                  <span className="text-[11px] font-sans text-outline uppercase tracking-wider block">
                    Forensic Graph Analysis
                  </span>
                  <button
                    onClick={handleShortestPath}
                    className="w-full bg-surface-container border border-outline-variant text-on-surface hover:border-primary py-1.5 px-3 rounded text-xs flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-amber-400">route</span>
                      <span>BFS Shortest Path to VASP</span>
                    </div>
                    <span className="text-[10px] text-outline font-mono">BFS</span>
                  </button>

                  <button
                    onClick={handleDfsTrace}
                    className="w-full bg-surface-container border border-outline-variant text-on-surface hover:border-primary py-1.5 px-3 rounded text-xs flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-cyan-400">device_hub</span>
                      <span>DFS Exhaustive Trace</span>
                    </div>
                    <span className="text-[10px] text-outline font-mono">DFS</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="w-full bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    <span>Reset Canvas View</span>
                  </button>
                </div>

                {/* Active Path Info Banner */}
                {activePathInfo && (
                  <div className="p-2.5 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-mono animate-fade-in flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
                    <span>{activePathInfo}</span>
                  </div>
                )}

                {/* Connected Components Card */}
                <div className="pt-2 border-t border-outline-variant/40 space-y-1.5">
                  <span className="text-[11px] font-sans text-outline uppercase tracking-wider block">
                    Disjoint Cluster Subnets
                  </span>
                  <div className="p-2.5 rounded bg-surface-container border border-outline-variant text-xs space-y-1">
                    <div className="text-primary font-bold">{components[0]?.componentId || 'Cluster 1'}</div>
                    <div className="text-outline text-[10px]">
                      {nodes.length} Nodes • {edges.length} Edges
                    </div>
                    <div className="text-on-surface font-semibold text-[11px]">
                      Total: ${(aggregatedFlows.totalVolumeUsd || 0).toLocaleString()} USD
                    </div>
                  </div>
                </div>

                {/* Typology Legend */}
                <div className="pt-2 border-t border-outline-variant/40 space-y-1">
                  <span className="text-[11px] font-sans text-outline uppercase tracking-wider block">
                    Typology Legend
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className="flex items-center gap-1 text-primary"><span className="w-2 h-2 rounded-full bg-primary"></span> Victim</div>
                    <div className="flex items-center gap-1 text-error"><span className="w-2 h-2 rounded-full bg-error"></span> Suspect</div>
                    <div className="flex items-center gap-1 text-tertiary"><span className="w-2 h-2 rounded-full bg-tertiary"></span> Mixer</div>
                    <div className="flex items-center gap-1 text-cyan-300"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Bridge</div>
                    <div className="flex items-center gap-1 text-amber-300"><span className="w-2 h-2 rounded-full bg-amber-400"></span> VASP / CEX</div>
                    <div className="flex items-center gap-1 text-purple-300"><span className="w-2 h-2 rounded-full bg-purple-400"></span> DEX</div>
                  </div>
                </div>
              </div>

              <div className="p-2 rounded bg-surface-container-lowest border border-outline-variant text-[10px] text-outline font-mono">
                Nodes: {nodes.length} | Edges: {edges.length} | Chain: {detectedChain}
              </div>
            </div>
          )}

          {/* Center React Flow Canvas */}
          <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg relative overflow-hidden shadow-inner min-w-0">
            {/* Floating Reopen Buttons for Collapsed Drawers */}
            {!showLeftPanel && (
              <button
                onClick={() => setShowLeftPanel(true)}
                className="absolute top-3 left-3 z-20 bg-surface-container/95 hover:bg-surface-container border border-outline-variant px-2.5 py-1.5 rounded-md text-xs font-medium text-on-surface flex items-center gap-1.5 shadow-md backdrop-blur-sm transition-colors cursor-pointer"
                title="Expand Algorithms Panel"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
                <span>Algorithms</span>
              </button>
            )}

            {!showRightPanel && (
              <button
                onClick={() => setShowRightPanel(true)}
                className="absolute top-3 right-3 z-20 bg-surface-container/95 hover:bg-surface-container border border-outline-variant px-2.5 py-1.5 rounded-md text-xs font-medium text-on-surface flex items-center gap-1.5 shadow-md backdrop-blur-sm transition-colors cursor-pointer"
                title="Expand Intelligence Panel"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                <span>Node Details</span>
              </button>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              fitViewOptions={{ padding: 0.25, minZoom: 0.35, maxZoom: 1.1 }}
              minZoom={0.2}
              maxZoom={2.0}
            >
              <Background color="#202530" gap={24} size={1} />
              <Controls className="!bg-surface-container !border-outline-variant !text-on-surface !rounded-md" />
            </ReactFlow>

            {/* Non-intrusive Canvas Status Badge at Bottom Left */}
            <div className="absolute bottom-3 left-14 bg-surface-container/90 backdrop-blur-md border border-outline-variant px-2.5 py-1 rounded text-[11px] flex items-center gap-2 select-none pointer-events-none z-10">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-mono text-on-surface font-medium">
                {isLiveLedger ? 'On-Chain Ledger Active' : 'Forensic Graph Engine Active'}
              </span>
              <span className="text-outline text-[10px]">• Click node for intelligence</span>
            </div>
          </div>

          {/* Right Intelligence Panel (Collapsible) */}
          {showRightPanel && (
            <div className="w-[300px] shrink-0 surface-level-1 border border-outline-variant rounded-lg p-3.5 flex flex-col justify-between overflow-y-auto space-y-3.5 shadow-sm transition-all">
              {selectedNode ? (
                <div className="space-y-3.5">
                  <div className="border-b border-outline-variant pb-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-sans text-outline uppercase tracking-wider">
                        {selectedNode.category || selectedNode.type}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          Number(String(selectedNode.riskScore || '0').split('/')[0]) >= 80 ? 'bg-error/20 text-error' : 'bg-primary/20 text-primary'
                        }`}>
                          Risk {selectedNode.riskScore}
                        </span>
                        <button
                          onClick={() => setShowRightPanel(false)}
                          className="text-outline hover:text-on-surface p-0.5 rounded hover:bg-surface-container-highest transition-colors cursor-pointer"
                          title="Collapse Panel"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-on-surface mt-1">{selectedNode.label}</h3>
                    <div className="text-[11px] font-mono text-primary mt-0.5 break-all">{selectedNode.address}</div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-sans text-outline uppercase tracking-wider block">Forensic Summary</span>
                    <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container p-2.5 rounded border border-outline-variant">
                      {selectedNode.details || selectedNode.metadata?.details || 'Node tracked in forensic investigation.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-container p-2 rounded border border-outline-variant">
                      <span className="text-[10px] font-sans text-outline uppercase block">Current Holding</span>
                      <span className="font-mono font-bold text-on-surface truncate block">{selectedNode.balance || '$0'}</span>
                    </div>
                    <div className="bg-surface-container p-2 rounded border border-outline-variant">
                      <span className="text-[10px] font-sans text-outline uppercase block">Attribution Verdict</span>
                      <span className="font-mono font-bold text-amber-300 truncate block">
                        {selectedAttribution?.attributionVerdict || 'Likely associated'}
                      </span>
                    </div>
                  </div>

                  {/* Probable Attribution Intelligence Card */}
                  {selectedAttribution && selectedAttribution.entity && (
                    <div className="p-2.5 rounded bg-surface-container border border-outline-variant space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[10px] text-outline font-sans uppercase">
                        <span>Attributed Entity</span>
                        <span className="text-primary font-mono font-bold">{selectedAttribution.attributionConfidence}% Confidence</span>
                      </div>
                      <div className="font-bold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[15px]">verified</span>
                        <span>{selectedAttribution.entity.entityName}</span>
                      </div>
                      <div className="text-[10px] text-outline font-mono">
                        {selectedAttribution.entity.entityType} • {selectedAttribution.supportingEvidence[0]?.signalTitle || 'Observed Co-spending'}
                      </div>
                      <div className="text-[9px] text-amber-300/80 italic pt-1 border-t border-outline-variant/30 leading-tight">
                        Probabilistic attribution; does not constitute confirmed legal ownership.
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-outline-variant/40 space-y-2">
                    <span className="text-[11px] font-sans text-outline uppercase tracking-wider block">Investigative Actions</span>
                    <button
                      onClick={() => navigate(`/wallet/${selectedNode.address}`)}
                      className="w-full bg-surface-container border border-outline-variant text-on-surface hover:border-primary py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">account_balance_wallet</span>
                      Open Wallet Intelligence
                    </button>

                    <a
                      href={getExplorerAddressUrl(selectedNode.blockchain || detectedChain, selectedNode.address)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-surface-container border border-outline-variant text-on-surface hover:border-primary py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">open_in_new</span>
                      View on Blockchain Explorer
                    </a>

                    <button
                      onClick={() => navigate(`/risk`)}
                      className="w-full bg-surface-container border border-outline-variant text-on-surface hover:border-error py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-error">shield</span>
                      Open Explainable Risk Breakdown
                    </button>

                    {(selectedNode.type?.toLowerCase() === 'vasp' || selectedNode.type?.toLowerCase() === 'exchange') && (
                      <button
                        onClick={() => navigate(`/vasp/binance-cluster-a`)}
                        className="w-full btn-primary py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">gavel</span>
                        Generate LEA Subpoena Request
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-outline text-xs">
                  <span className="material-symbols-outlined text-[32px] mb-2 opacity-50">touch_app</span>
                  Select any node in the canvas to view detailed forensic metadata.
                </div>
              )}

              <div className="text-[10px] text-outline text-center pt-2 border-t border-outline-variant/40 font-mono">
                DirectedForensicGraph Engine v2.4
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'timeline' ? (
        /* Transaction Timeline View */
        <div className="flex-1 surface-level-1 border border-outline-variant rounded-lg p-6 overflow-y-auto space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
            <div>
              <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
                Chronological Fund-Flow Timeline
              </h3>
              <p className="text-xs text-outline mt-0.5">
                Step-by-step movement of illicit assets across transactions ({detectedChain}).
              </p>
            </div>
            <div className="text-xs font-mono text-primary font-bold">
              Total Volume: ${aggregatedFlows.totalVolumeUsd.toLocaleString()} USD
            </div>
          </div>

          <div className="space-y-3">
            {timeline.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant font-mono text-xs">
                No transactions recorded for this wallet address yet.
              </div>
            ) : timeline.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-surface-container border border-outline-variant/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono font-bold text-[11px]">
                    {item.hopNumber}
                  </span>
                  <div>
                    <div className="font-semibold text-on-surface flex items-center gap-2">
                      <span>{item.sourceLabel}</span>
                      <span className="material-symbols-outlined text-[14px] text-outline">arrow_forward</span>
                      <span className="text-primary">{item.targetLabel}</span>
                    </div>
                    <div className="text-[11px] text-outline font-mono mt-0.5 flex items-center gap-2">
                      <span>TxHash: {item.txHash.slice(0, 18)}...</span>
                      <span>• Block #{item.blockNumber}</span>
                      <a
                        href={getExplorerTxUrl(detectedChain, item.txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        <span>Explorer</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-on-surface">
                    {item.amount} {item.asset}
                  </div>
                  <div className="text-[11px] text-primary font-mono">
                    ${item.amountUsd.toLocaleString()} USD
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-container-highest text-outline font-mono">
                    {item.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Intermediaries & Mules View */
        <div className="flex-1 surface-level-1 border border-outline-variant rounded-lg p-6 overflow-y-auto space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-outline-variant">
            <div>
              <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
                Automated Intermediary & Mule Detection
              </h3>
              <p className="text-xs text-outline mt-0.5">
                Algorithms detect pass-through laundering relays based on in/out-degree, retention rate, and velocity.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 font-mono font-bold">
              {intermediaries.length} Relays Flagged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {intermediaries.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-on-surface-variant font-mono text-xs">
                No pass-through mule intermediaries detected in this sub-graph cluster.
              </div>
            ) : intermediaries.map((im, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-surface-container border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-error/20 text-error">
                    {im.classification}
                  </span>
                  <span className="text-xs font-mono text-outline">
                    Betweenness: {im.betweennessScore}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-on-surface">{im.node.label}</h4>
                  <div className="text-xs font-mono text-outline truncate">{im.node.address}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-surface-container-lowest p-2.5 rounded border border-outline-variant/40">
                  <div>
                    <div className="text-[10px] text-outline">Received</div>
                    <div className="font-bold text-on-surface">${im.totalReceivedUsd.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-outline">Forwarded</div>
                    <div className="font-bold text-primary">${im.totalForwardedUsd.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-outline">Retention</div>
                    <div className={`font-bold ${im.retentionRate < 10 ? 'text-error' : 'text-on-surface'}`}>
                      {im.retentionRate}%
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-outline pt-1">
                  <span>In-Degree: {im.inDegree} • Out-Degree: {im.outDegree}</span>
                  <button
                    onClick={() => {
                      setSelectedNode(im.node);
                      setActiveTab('canvas');
                    }}
                    className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Highlight on Canvas</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recursive Multi-Hop Crawler Intelligence Modal */}
      {showCrawlerModal && crawlerResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-4xl max-h-[85vh] bg-surface-container border border-outline-variant rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-high shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary text-2xl">travel_explore</span>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Recursive Multi-Hop Trace Intelligence</h3>
                  <div className="text-[11px] font-mono text-outline">
                    Traversed downstream from <span className="text-primary font-semibold">{crawlerResult.startAddress.slice(0, 10)}...{crawlerResult.startAddress.slice(-6)}</span> ({crawlerResult.blockchain})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-amber-400/15 border border-amber-400/30 text-amber-300 font-semibold">
                  {crawlerResult.identifiedEndpoints.length} VASP Sinks Flagged
                </span>
                <button
                  type="button"
                  onClick={() => setShowCrawlerModal(false)}
                  className="p-1 rounded hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors cursor-pointer"
                  title="Close"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Metric Strip */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-surface-container-lowest border-b border-outline-variant text-center text-xs font-mono shrink-0">
              <div className="p-2 rounded bg-surface-container border border-outline-variant/40">
                <div className="text-[10px] text-outline uppercase">Max Depth Reached</div>
                <div className="text-sm font-bold text-primary">{crawlerResult.maxDepthReached} Hops</div>
              </div>
              <div className="p-2 rounded bg-surface-container border border-outline-variant/40">
                <div className="text-[10px] text-outline uppercase">Network Explored</div>
                <div className="text-sm font-bold text-on-surface">{crawlerResult.totalNodesExplored} Nodes / {crawlerResult.totalEdgesExplored} Edges</div>
              </div>
              <div className="p-2 rounded bg-surface-container border border-outline-variant/40">
                <div className="text-[10px] text-outline uppercase">Total Volume Tracked</div>
                <div className="text-sm font-bold text-amber-300">{crawlerResult.totalVolumeTracked.toFixed(2)} {crawlerResult.blockchain === 'Bitcoin' ? 'BTC' : 'ETH'}</div>
              </div>
              <div className="p-2 rounded bg-surface-container border border-outline-variant/40">
                <div className="text-[10px] text-outline uppercase">Execution Time</div>
                <div className="text-sm font-bold text-on-surface">{crawlerResult.executionTimeMs} ms</div>
              </div>
            </div>

            {/* Body: 2 Columns or Stacked Sections */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Section 1: Identified Terminal VASP / Exchange Sinks */}
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-400">account_balance</span>
                  <span>Discovered Exchange & Privacy Sinks ({crawlerResult.identifiedEndpoints.length})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {crawlerResult.identifiedEndpoints.length === 0 ? (
                    <div className="col-span-2 text-center py-6 text-outline text-xs font-mono">
                      No terminal exchange endpoints encountered within {crawlerResult.maxDepthReached} hops meeting volume threshold.
                    </div>
                  ) : (
                    crawlerResult.identifiedEndpoints.map((ep, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-surface-container border border-outline-variant space-y-2 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            ep.entityType.toLowerCase().includes('mixer')
                              ? 'bg-tertiary/20 text-tertiary'
                              : 'bg-amber-400/20 text-amber-300'
                          }`}>
                            {ep.entityType} • Hop {ep.hop}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-emerald-400">
                            {ep.confidence}% Confidence
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-on-surface">{ep.entityName}</div>
                          <div className="text-[10px] font-mono text-outline truncate">{ep.address}</div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] pt-1 border-t border-outline-variant/40">
                          <span className="font-mono text-on-surface font-semibold">
                            Received: {ep.totalReceivedFromTrace.toFixed(2)} {crawlerResult.blockchain === 'Bitcoin' ? 'BTC' : 'ETH'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCrawlerModal(false);
                                setActiveTab('canvas');
                                const targetNode = nodes.find((n) => (n.data as any)?.address?.toLowerCase() === ep.address.toLowerCase());
                                if (targetNode) setSelectedNode(targetNode.data);
                              }}
                              className="px-2 py-0.5 rounded bg-surface-container-highest hover:bg-surface-container-high text-primary text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              Focus
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCrawlerModal(false);
                                navigate('/sahyog');
                              }}
                              className="px-2 py-0.5 rounded bg-primary/20 hover:bg-primary/30 text-primary text-[10px] font-medium transition-colors cursor-pointer"
                            >
                              Sahyog Notice
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 2: Reconstructed Multi-Hop Laundering Pathways */}
              <div>
                <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-cyan-400">route</span>
                  <span>Reconstructed Fund Pathways ({crawlerResult.paths.length})</span>
                </h4>

                <div className="space-y-2">
                  {crawlerResult.paths.length === 0 ? (
                    <div className="text-center py-6 text-outline text-xs font-mono">
                      No complete laundering pathways resolved.
                    </div>
                  ) : (
                    crawlerResult.paths.map((p, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs transition-colors cursor-pointer ${
                          selectedPathIndex === idx
                            ? 'bg-primary/10 border-primary shadow-sm'
                            : 'bg-surface-container border-outline-variant hover:border-outline'
                        }`}
                        onClick={() => {
                          handleHighlightPath(p, idx);
                          setShowCrawlerModal(false);
                          setActiveTab('canvas');
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-on-surface font-mono">
                            Path #{idx + 1} ({p.hops} consecutive hops)
                          </span>
                          <span className="font-mono font-bold text-amber-300">
                            {p.totalVolume.toFixed(2)} {p.asset}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-on-surface-variant">
                          {p.pathLabels.map((lbl, lIdx) => (
                            <React.Fragment key={lIdx}>
                              <span className={`px-1.5 py-0.5 rounded ${
                                lIdx === 0 ? 'bg-error/20 text-error font-semibold' :
                                lIdx === p.pathLabels.length - 1 ? 'bg-amber-400/20 text-amber-300 font-semibold' :
                                'bg-surface-container-highest text-on-surface'
                              }`}>
                                {lbl}
                              </span>
                              {lIdx < p.pathLabels.length - 1 && (
                                <span className="material-symbols-outlined text-[12px] text-outline">arrow_forward</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-outline-variant bg-surface-container-high flex justify-between items-center text-xs shrink-0">
              <span className="text-[11px] text-outline font-mono">
                Cryptographic Trace Evidence • Law Enforcement Sensitive
              </span>
              <button
                type="button"
                onClick={() => setShowCrawlerModal(false)}
                className="btn-primary px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
