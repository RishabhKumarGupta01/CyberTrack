import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { blockchainRegistry, AdapterBalance, AdapterTransaction } from '../blockchain';
import { entityIntelligence } from '../attribution/EntityIntelligenceLayer';
import { riskEngine } from '../risk/RiskEngine';
import { SupabaseService } from '../services/supabaseService';
import { Case } from '../types';

export const WalletIntelligence: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();

  // Active cases from Supabase
  const [activeCases, setActiveCases] = useState<Case[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string>(address || '');
  const targetAddress = selectedWallet.trim();

  const [activeTab, setActiveTab] = useState<'txs' | 'attribution' | 'risk' | 'peers'>('txs');
  const [copied, setCopied] = useState(false);
  const [isMonitored, setIsMonitored] = useState(true);

  // Live Blockchain State
  const [balance, setBalance] = useState<AdapterBalance | null>(null);
  const [liveTxs, setLiveTxs] = useState<AdapterTransaction[]>([]);
  const [detectedChain, setDetectedChain] = useState<string>('Ethereum');
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);

  // Load active cases from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const loadCases = async () => {
      try {
        const fetched = await SupabaseService.getCases();
        if (isMounted && fetched && fetched.length > 0) {
          setActiveCases(fetched);
          if (!address && !selectedWallet) {
            setSelectedWallet(fetched[0].targetAddress || '');
          }
        }
      } catch (err) {
        console.warn('Failed to load active cases in WalletIntelligence:', err);
      }
    };
    loadCases();
    return () => {
      isMounted = false;
    };
  }, [address]);

  // Sync state if URL address changes
  useEffect(() => {
    if (address) {
      setSelectedWallet(address);
    }
  }, [address]);

  useEffect(() => {
    if (!targetAddress) {
      setBalance(null);
      setLiveTxs([]);
      return;
    }

    let isMounted = true;
    const fetchLiveChainData = async () => {
      setIsLoadingLive(true);
      try {
        const adapter = blockchainRegistry.detectAdapterForAddress(targetAddress) || blockchainRegistry.get('Ethereum');
        if (isMounted) setDetectedChain(adapter.blockchain);

        const [bal, txs] = await Promise.all([
          adapter.get_balance(targetAddress).catch(() => null),
          adapter.get_transactions(targetAddress, { limit: 20 }).catch(() => []),
        ]);

        if (isMounted) {
          setBalance(bal || {
            address: targetAddress,
            blockchain: adapter.blockchain,
            balance: '0.00',
            balanceRaw: '0',
            assetSymbol: adapter.nativeAsset,
            updatedAt: new Date().toISOString(),
          });
          setLiveTxs(txs || []);
        }
      } catch (err) {
        console.warn('Live blockchain fetch exception:', err);
      } finally {
        if (isMounted) setIsLoadingLive(false);
      }
    };

    fetchLiveChainData();
    return () => { isMounted = false; };
  }, [targetAddress]);

  // Real Dynamic Entity Attribution
  const attribution = useMemo(() => {
    return entityIntelligence.attributeAddress(targetAddress, {
      chain: detectedChain as any,
    });
  }, [targetAddress, detectedChain]);

  // Real Dynamic Risk Assessment
  const riskAssessment = useMemo(() => {
    return riskEngine.assessRisk({
      target_address: targetAddress,
      blockchain: detectedChain,
    });
  }, [targetAddress, detectedChain]);

  // Real Peers Derived from Live Transactions
  const peers = useMemo(() => {
    const map = new Map<string, { addr: string; vol: number; txs: number; dir: 'IN' | 'OUT' }>();
    for (const tx of liveTxs) {
      const isIncoming = tx.to?.toLowerCase() === targetAddress.toLowerCase();
      const party = isIncoming ? tx.from : tx.to;
      if (!party) continue;
      const lower = party.toLowerCase();
      const existing = map.get(lower) || { addr: party, vol: 0, txs: 0, dir: isIncoming ? 'IN' : 'OUT' };
      existing.vol += parseFloat(tx.value) || 0;
      existing.txs += 1;
      map.set(lower, existing);
    }
    return Array.from(map.values()).slice(0, 6);
  }, [liveTxs, targetAddress]);

  const getExplorerUrl = (chain: string, addr: string): string => {
    const c = chain.toLowerCase();
    if (c.includes('btc') || c.includes('bitcoin')) return `https://mempool.space/address/${addr}`;
    if (c.includes('sol')) return `https://solscan.io/account/${addr}`;
    if (c.includes('tron')) return `https://tronscan.org/#/address/${addr}`;
    if (c.includes('avax') || c.includes('avalanche')) return `https://snowtrace.io/address/${addr}`;
    return `https://etherscan.io/address/${addr}`;
  };

  const getTxExplorerUrl = (chain: string, hash: string): string => {
    const c = chain.toLowerCase();
    if (c.includes('btc') || c.includes('bitcoin')) return `https://mempool.space/tx/${hash}`;
    if (c.includes('sol')) return `https://solscan.io/tx/${hash}`;
    if (c.includes('tron')) return `https://tronscan.org/#/transaction/${hash}`;
    if (c.includes('avax') || c.includes('avalanche')) return `https://snowtrace.io/tx/${hash}`;
    return `https://etherscan.io/tx/${hash}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(targetAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-outline-variant">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-surface-container border border-outline-variant text-on-surface-variant text-[10px] font-bold tracking-wider uppercase rounded">
              {detectedChain} Network
            </span>
            <div className="flex items-center gap-1.5 text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                {isLoadingLive ? 'Connecting Node...' : 'Live On-Chain'}
              </span>
            </div>
            <button
              onClick={() => setIsMonitored(!isMonitored)}
              className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                isMonitored
                  ? 'text-primary bg-primary-container/10 border-primary/30'
                  : 'text-outline bg-surface-container border-outline-variant'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isMonitored ? 'bg-primary animate-pulse' : 'bg-outline'}`}></span>
              <span>{isMonitored ? 'Live Monitoring Active' : 'Enable Monitoring'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getExplorerUrl(detectedChain, targetAddress)}
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-surface-container border border-outline-variant hover:border-outline text-on-surface px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              Explorer
            </a>
            <button
              onClick={() => {
                const matchedCase = activeCases.find(c => c.targetAddress?.toLowerCase() === targetAddress.toLowerCase());
                navigate(matchedCase ? `/graph/${matchedCase.caseId}` : `/graph/${targetAddress}`);
              }}
              className="btn-primary text-xs px-3.5 py-1.5 rounded-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">account_tree</span>
              Open in Graph
            </button>
          </div>
        </div>

        {/* Active Cases Quick-Selector */}
        {activeCases.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] pt-2 border-t border-outline-variant/30 flex-wrap">
            <span className="text-outline uppercase tracking-wider font-sans text-[10px] mr-1">Active Cases:</span>
            {activeCases.map((c) => (
              <button
                key={c.caseId || c.id}
                onClick={() => setSelectedWallet(c.targetAddress)}
                className={`px-2.5 py-0.5 rounded border text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                  targetAddress.toLowerCase() === c.targetAddress?.toLowerCase()
                    ? 'bg-primary/20 border-primary text-primary font-bold'
                    : 'bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span>{c.caseId}</span>
                <span className="text-outline text-[9px]">({c.title} • {c.network})</span>
              </button>
            ))}
          </div>
        )}

        {/* Address Banner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-xl font-bold text-on-surface tracking-tight">
              {targetAddress || 'No Address Selected'}
            </h2>
            <button
              onClick={handleCopy}
              className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded hover:bg-surface-variant"
              title="Copy Address"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
            </button>
            <span className="text-xs text-outline border-l border-outline-variant pl-3">
              Network: <span className="text-primary font-mono">{detectedChain}</span>
            </span>
          </div>
          <span className="text-xs text-outline font-mono">
            Node status: <span className="text-primary font-semibold">{isLoadingLive ? 'Fetching...' : 'Synchronized'}</span>
          </span>
        </div>
      </div>

      {/* 5-Column KPI Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="surface-level-1 border border-outline-variant p-3.5 flex flex-col justify-between rounded-md shadow-sm">
          <span className="text-[10px] font-sans uppercase tracking-wider text-outline">Current Balance</span>
          <div className="mt-2">
            <div className="text-lg font-bold text-on-surface font-mono">
              {balance ? `${Number(balance.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${balance.assetSymbol}` : (isLoadingLive ? 'Querying...' : '0.00')}
            </div>
            <div className="text-[11px] text-outline font-mono mt-0.5">
              Verified On-Chain
            </div>
          </div>
        </div>

        <div className="surface-level-1 border border-outline-variant p-3.5 flex flex-col justify-between rounded-md shadow-sm">
          <span className="text-[10px] font-sans uppercase tracking-wider text-outline">Indexed Transactions</span>
          <div className="mt-2">
            <div className="text-lg font-bold text-on-surface font-mono">
              {liveTxs.length > 0 ? `${liveTxs.length} Loaded` : (isLoadingLive ? 'Scanning...' : '0 Recorded')}
            </div>
            <div className="text-[11px] text-primary flex items-center gap-1 font-mono mt-0.5">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>
              Live Node Stream
            </div>
          </div>
        </div>

        <div className="surface-level-1 border border-outline-variant p-3.5 flex flex-col justify-between rounded-md shadow-sm">
          <span className="text-[10px] font-sans uppercase tracking-wider text-outline">Active Counterparties</span>
          <div className="mt-2">
            <div className="text-lg font-bold text-on-surface font-mono">
              {peers.length > 0 ? `${peers.length} Peers` : (isLoadingLive ? 'Scanning...' : '0 Peers')}
            </div>
            <div className="text-[11px] text-outline flex items-center gap-1 font-mono mt-0.5">
              <span className="material-symbols-outlined text-[12px]">hub</span>
              On-Chain Counterparties
            </div>
          </div>
        </div>

        <div className="surface-level-1 border border-outline-variant p-3.5 flex flex-col justify-between rounded-md shadow-sm">
          <span className="text-[10px] font-sans uppercase tracking-wider text-outline">Native Asset</span>
          <div className="mt-2">
            <div className="text-lg font-bold text-on-surface font-mono">
              {balance?.assetSymbol || 'ETH'}
            </div>
            <div className="text-[11px] text-outline font-mono mt-0.5">
              {detectedChain} Protocol
            </div>
          </div>
        </div>

        <div className="surface-level-1 border border-outline-variant p-3.5 flex flex-col justify-between rounded-md shadow-sm">
          <span className="text-[10px] font-sans uppercase tracking-wider text-outline">Entity Attribution</span>
          <div className="mt-2">
            <div className="text-lg font-bold text-primary flex items-center gap-1.5 truncate">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              {attribution.entity?.entityName || 'Unattributed'}
            </div>
            <div className="text-[11px] text-outline font-mono mt-0.5">{attribution.attributionConfidence}% confidence match</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-outline-variant gap-1 text-xs">
        {[
          { id: 'txs', label: `Transaction Forensics (${liveTxs.length})`, icon: 'receipt_long' },
          { id: 'attribution', label: 'Entity Attribution & Clusters', icon: 'business_center' },
          { id: 'risk', label: 'Risk Factor Breakdown', icon: 'shield' },
          { id: 'peers', label: 'Counterparty Topologies', icon: 'hub' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-surface-container/50'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container/20'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'txs' && (
        <div className="surface-level-1 border border-outline-variant rounded-md shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-lowest">
            <span className="text-xs font-semibold text-on-surface">
              {liveTxs.length > 0 ? `Live Transaction Stream (${liveTxs.length} transactions from node)` : 'Transaction Forensics'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-outline">Network:</span>
              <span className="text-[11px] font-mono text-primary bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
                {detectedChain}
              </span>
            </div>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant text-[10px] font-sans text-outline uppercase tracking-wider">
                <th className="px-4 py-2.5">Flow</th>
                <th className="px-4 py-2.5">Tx Hash</th>
                <th className="px-4 py-2.5">Block / Age</th>
                <th className="px-4 py-2.5">Counterparty</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {liveTxs.length > 0 ? (
                liveTxs.map((tx, i) => {
                  const isIncoming = tx.to?.toLowerCase() === targetAddress.toLowerCase();
                  const counterparty = isIncoming ? (tx.from || 'Coinbase') : (tx.to || 'Contract Execution');
                  return (
                    <tr key={tx.hash || i} className="border-b border-outline-variant/30 hover:bg-surface-variant transition-colors font-mono">
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isIncoming ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'
                        }`}>
                          {isIncoming ? 'IN' : 'OUT'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={getTxExplorerUrl(detectedChain, tx.hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-outline text-[11px]">
                        {tx.dateTime ? new Date(tx.dateTime).toLocaleDateString() : `#${tx.blockNumber}`}
                      </td>
                      <td className="px-4 py-3 text-on-surface truncate max-w-[200px]" title={counterparty}>
                        {counterparty.length > 20 ? `${counterparty.slice(0, 10)}...${counterparty.slice(-8)}` : counterparty}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${isIncoming ? 'text-primary' : 'text-on-surface'}`}>
                        {isIncoming ? '+' : '-'} {tx.value} {tx.assetSymbol}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface">
                          {tx.status?.toUpperCase() || 'CONFIRMED'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-outline font-mono text-xs">
                    {isLoadingLive ? 'Scanning blockchain node for transactions...' : 'No on-chain transactions recorded for this address on this network.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'attribution' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 surface-level-1 border border-outline-variant rounded-md p-5 space-y-4">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              {attribution.entity ? `Identified Entity: ${attribution.entity.entityName}` : 'Unattributed / Private Wallet'}
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {attribution.entity
                ? `Address identified with ${attribution.attributionConfidence}% probabilistic attribution confidence as part of ${attribution.entity.entityName} (${attribution.entity.entityType}).`
                : 'No registered VASP, exchange deposit cluster, or OFAC sanctioned contract matched on-chain for this address. Evaluated as an independent private wallet.'}
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-surface-container p-3 rounded border border-outline-variant">
                <span className="text-[10px] font-sans text-outline uppercase block">Attribution Confidence</span>
                <span className="text-base font-bold text-primary font-mono">{attribution.attributionConfidence}%</span>
              </div>
              <div className="bg-surface-container p-3 rounded border border-outline-variant">
                <span className="text-[10px] font-sans text-outline uppercase block">Entity Classification</span>
                <span className="text-base font-bold text-on-surface font-mono">{attribution.entity?.entityType || 'Private Address'}</span>
              </div>
              <div className="bg-surface-container p-3 rounded border border-outline-variant">
                <span className="text-[10px] font-sans text-outline uppercase block">Jurisdiction</span>
                <span className="text-base font-bold text-tertiary font-mono">{attribution.entity?.metadata?.jurisdiction || 'Decentralized / P2P'}</span>
              </div>
            </div>
          </div>

          <div className="col-span-4 surface-level-1 border border-outline-variant rounded-md p-5 space-y-3">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-[18px]">rule</span>
              Attribution Heuristics
            </h3>
            <div className="space-y-2 text-xs">
              {attribution.supportingEvidence.length === 0 ? (
                <div className="p-3 text-center text-outline text-xs font-mono">
                  No automated cluster matches triggered.
                </div>
              ) : (
                attribution.supportingEvidence.map((ev, i) => (
                  <div key={i} className="bg-surface-container p-2.5 rounded border border-outline-variant flex justify-between items-center">
                    <span className="text-on-surface font-mono truncate max-w-[180px]">{ev.heuristic}</span>
                    <span className="text-primary font-bold font-mono">+{ev.confidenceScore} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-4 surface-level-1 border border-outline-variant rounded-md p-5 flex flex-col items-center justify-center text-center space-y-3">
            <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${
              riskAssessment.risk_score >= 70 ? 'border-error bg-error-container/10 text-error' :
              riskAssessment.risk_score >= 40 ? 'border-amber-500 bg-amber-500/10 text-amber-400' :
              'border-primary bg-primary-container/10 text-primary'
            }`}>
              <span className="text-3xl font-extrabold font-mono">{riskAssessment.risk_score}</span>
              <span className="text-[10px] font-bold uppercase">{riskAssessment.risk_level}</span>
            </div>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Algorithmic multi-factor score computed by RiskEngine evaluating on-chain transaction behavior, mixer exposure, and flow velocity.
            </p>
          </div>

          <div className="col-span-8 surface-level-1 border border-outline-variant rounded-md p-5 space-y-3">
            <h3 className="text-sm font-semibold text-on-surface">Weighted Risk Factors</h3>
            <div className="space-y-2.5">
              {riskAssessment.risk_factors.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant p-4 rounded text-center text-outline text-xs font-mono">
                  No illicit exposure or suspicious behavioral indicators detected on this address.
                </div>
              ) : (
                riskAssessment.risk_factors.map((rf, i) => (
                  <div key={i} className="bg-surface-container border border-outline-variant p-3 rounded flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-on-surface block">{rf.name}</span>
                      <span className="text-[11px] text-outline mt-0.5 block">{rf.evidence}</span>
                    </div>
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      rf.severity === 'CRITICAL' || rf.severity === 'HIGH' ? 'bg-error/20 text-error' : 'bg-tertiary/20 text-tertiary'
                    }`}>+{rf.score_impact} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'peers' && (
        <div className="surface-level-1 border border-outline-variant rounded-md p-5 space-y-4">
          <h3 className="text-sm font-semibold text-on-surface">Top Direct Counterparties from Live Transactions</h3>
          {peers.length === 0 ? (
            <div className="p-8 text-center text-outline text-xs font-mono">
              No on-chain counterparty records available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {peers.map((peer, i) => (
                <div key={i} className="bg-surface-container border border-outline-variant p-3.5 rounded space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-on-surface">Counterparty #{i + 1}</span>
                    <span className={`text-[10px] font-sans uppercase tracking-wider px-1.5 py-0.2 rounded font-mono font-bold ${
                      peer.dir === 'IN' ? 'bg-primary/20 text-primary' : 'bg-tertiary/20 text-tertiary'
                    }`}>
                      {peer.dir === 'IN' ? 'Sender' : 'Recipient'}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-primary truncate" title={peer.addr}>
                    {peer.addr}
                  </div>
                  <div className="flex justify-between text-[11px] text-outline pt-1 border-t border-outline-variant/40 font-mono">
                    <span>Volume: {peer.vol.toFixed(4)}</span>
                    <span>{peer.txs} Txs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
