import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { entityIntelligence } from '../attribution/EntityIntelligenceLayer';
import { EntityRecord, ProbableAttributionResult, SupportingEvidence } from '../attribution/types';
import { blockchainRegistry } from '../blockchain/AdapterRegistry';
import { SupabaseService } from '../services/supabaseService';
import { Case } from '../types';

export const VaspIntelligence: React.FC = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();

  // Active cases from Supabase
  const [activeCases, setActiveCases] = useState<Case[]>([]);

  // Selected Target Address for Attribution
  const [targetAddress, setTargetAddress] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'attribution' | 'directory'>('attribution');
  const [isLoadingTxs, setIsLoadingTxs] = useState<boolean>(false);
  const [realTransactions, setRealTransactions] = useState<any[]>([]);
  const [detectedChain, setDetectedChain] = useState<string>('Ethereum');

  // All pre-registered entities in knowledge base
  const allEntities = useMemo(() => entityIntelligence.getAllEntities(), []);

  // Load active cases from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const loadCases = async () => {
      try {
        const cases = await SupabaseService.getCases();
        if (isMounted && cases && cases.length > 0) {
          setActiveCases(cases);
          if (!targetAddress) {
            setTargetAddress(cases[0].targetAddress || '');
          }
        }
      } catch (err) {
        console.warn('Could not load cases in VaspIntelligence:', err);
      }
    };
    loadCases();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch real on-chain transactions when targetAddress changes
  useEffect(() => {
    const clean = targetAddress.trim();
    if (!clean) {
      setRealTransactions([]);
      return;
    }

    const adapter = blockchainRegistry.detectAdapterForAddress(clean);
    if (adapter) {
      setDetectedChain(adapter.blockchain);
      setIsLoadingTxs(true);
      adapter.get_transactions(clean, { limit: 25 })
        .then((txs) => {
          setRealTransactions(txs || []);
          setIsLoadingTxs(false);
        })
        .catch((err) => {
          console.warn('Failed to fetch on-chain transactions for VASP attribution:', err);
          setRealTransactions([]);
          setIsLoadingTxs(false);
        });
    } else {
      setDetectedChain('Ethereum');
      setRealTransactions([]);
    }
  }, [targetAddress]);

  // Dynamic Attribution Execution with Multi-Signal Context from REAL on-chain data
  const attributionResult: ProbableAttributionResult = useMemo(() => {
    const clean = targetAddress.trim();
    if (!clean) {
      return entityIntelligence.attributeAddress('0x0000000000000000000000000000000000000000', {
        chain: detectedChain as any,
        transactions: [],
      });
    }

    // Convert real transactions to attribution format
    const formattedTxs = realTransactions.map((tx) => {
      const fromAddr = (tx.from || tx.from_address || '').trim();
      const toAddr = (tx.to || tx.to_address || '').trim();
      const isOut = fromAddr.toLowerCase() === clean.toLowerCase();
      return {
        txHash: tx.hash || tx.tx_hash || '',
        fromAddress: fromAddr,
        toAddress: toAddr,
        amount: String(tx.value || tx.amount || '0'),
        asset: tx.assetSymbol || tx.asset || 'NATIVE',
        timestamp: tx.timestamp || Math.floor(Date.now() / 1000),
        blockNumber: tx.blockNumber || tx.block_number || 0,
        isSwept: tx.direction ? tx.direction === 'outgoing' : isOut,
      };
    });

    // Extract real neighbors from real counterparties
    const neighbors = realTransactions
      .map((tx) => {
        const fromAddr = (tx.from || tx.from_address || '').trim();
        const toAddr = (tx.to || tx.to_address || '').trim();
        const isOut = fromAddr.toLowerCase() === clean.toLowerCase();
        const neighbor = isOut ? toAddr : fromAddr;
        const valNum = parseFloat(String(tx.value || tx.amount || '0')) || 0;
        return {
          neighborAddress: neighbor,
          hops: 1,
          volumeUsd: tx.amount_usd || (valNum * 3000) || 0,
          direction: (isOut ? 'outgoing' : 'incoming') as 'incoming' | 'outgoing',
        };
      })
      .filter((n) => Boolean(n.neighborAddress));

    const coSpent = realTransactions
      .filter((tx) => {
        const fromAddr = (tx.from || tx.from_address || '').trim();
        return fromAddr.toLowerCase() === clean.toLowerCase();
      })
      .map((tx) => (tx.to || tx.to_address || '').trim())
      .filter(Boolean);

    return entityIntelligence.attributeAddress(clean, {
      chain: detectedChain as any,
      transactions: formattedTxs,
      coSpentAddresses: Array.from(new Set(coSpent)),
      graphNeighbors: neighbors,
    });
  }, [targetAddress, realTransactions, detectedChain]);

  const activeEntity: EntityRecord | null = attributionResult.entity;

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 select-none">
      {/* Top Header */}
      <div className="flex justify-between items-end border-b border-outline-variant pb-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] mb-1">
            <span className="font-sans text-outline uppercase tracking-widest">Intelligence Layer</span>
            <span className="text-outline">/</span>
            <span className="font-sans text-primary uppercase tracking-widest">Entity & VASP Attribution</span>
          </div>
          <h2 className="text-xl font-semibold text-on-surface leading-tight tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary text-[24px]">business_center</span>
            Entity Intelligence & Probable VASP Attribution
          </h2>
          <p className="text-on-surface-variant mt-0.5 text-xs">
            Multivariate probabilistic attribution of blockchain addresses based on address registries, co-spending clusters, behavioral sweeps, and graph proximity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Tab Selector */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/60 mr-2">
            <button
              onClick={() => setActiveTab('attribution')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'attribution' ? 'bg-primary text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">verified</span>
              Probable Attribution
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'directory' ? 'bg-primary text-on-primary-container' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">list_alt</span>
              Entity Directory ({allEntities.length})
            </button>
          </div>

          <button
            onClick={() => {
              const matchedCase = activeCases.find(c => c.targetAddress?.toLowerCase() === targetAddress.toLowerCase());
              navigate(matchedCase ? `/reports/${matchedCase.caseId}` : '/reports');
            }}
            className="btn-secondary px-3 py-1.5 text-xs rounded flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">file_download</span>
            Attribution Dossier
          </button>
          <button
            onClick={() => {
              navigate(`/ncrp-sahyog?tab=sahyog&addr=${encodeURIComponent(targetAddress)}`);
            }}
            className="btn-primary px-3 py-1.5 text-xs rounded font-semibold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">shield</span>
            SAHYOG BNSS Notice
          </button>
        </div>
      </div>

      {/* Target Address Evaluator Bar */}
      <div className="surface-level-1 border border-outline-variant rounded-lg p-3 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">search</span>
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wide">Attribution Query Target:</span>
          <input
            type="text"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value.trim())}
            placeholder="Enter real blockchain address to evaluate probable attribution..."
            className="flex-1 bg-surface-container border border-outline-variant rounded px-3 py-1.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
          />
          {isLoadingTxs && (
            <span className="text-[11px] font-mono text-primary flex items-center gap-1 px-2">
              <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
              Querying on-chain...
            </span>
          )}
          {targetAddress && (
            <button
              onClick={() => setTargetAddress('')}
              className="btn-secondary text-xs px-2.5 py-1.5 rounded font-mono"
            >
              Clear
            </button>
          )}
        </div>

        {/* Active Case Quick-Selection Chips */}
        {activeCases.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] pt-1 border-t border-outline-variant/30 flex-wrap">
            <span className="text-outline uppercase tracking-wider font-sans text-[10px] mr-1">Active Cases:</span>
            {activeCases.map((c) => (
              <button
                key={c.caseId || c.id}
                onClick={() => setTargetAddress(c.targetAddress)}
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
      </div>

      {activeTab === 'attribution' ? (
        /* Main Attribution Grid */
        <div className="grid grid-cols-12 gap-5">
          {/* Left Column: Attribution Card & Evidence Breakdown (8-col) */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="surface-level-1 border border-outline-variant rounded-lg p-5 space-y-5 shadow-sm">
              {/* Header Attribution Verdict */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-bold tracking-wider uppercase rounded font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      {attributionResult.attributionVerdict}
                    </span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 text-[10px] font-bold uppercase rounded font-mono">
                      {activeEntity?.entityType || 'Financial Entity'}
                    </span>
                    <span className="px-2 py-0.5 bg-surface-container text-outline text-[10px] font-mono rounded">
                      Chain: {activeEntity?.chain || 'Multi-Chain'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-on-surface mt-2 flex items-center gap-2">
                    {activeEntity ? activeEntity.entityName : 'Unattributed Entity Cluster'}
                  </h3>
                  <div className="text-xs font-mono text-outline mt-0.5 flex items-center gap-2">
                    <span>Subject:</span>
                    <span className="text-primary font-bold break-all">{attributionResult.targetAddress}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-sans text-outline uppercase tracking-wider block">Attribution Confidence</span>
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="text-3xl font-extrabold text-primary font-mono">
                      {attributionResult.attributionConfidence}%
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-outline block">
                    {attributionResult.supportingEvidence.length} Corroborating Signals
                  </span>
                </div>
              </div>

              {/* Mandatory Entity Record Details (Specification Compliance) */}
              {activeEntity && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-surface-container rounded border border-outline-variant text-xs">
                  <div>
                    <span className="text-[10px] text-outline uppercase block font-sans">Entity Name</span>
                    <span className="font-semibold text-on-surface font-mono">{activeEntity.entityName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase block font-sans">Entity Type</span>
                    <span className="font-semibold text-primary font-mono">{activeEntity.entityType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase block font-sans">Confidence & Source</span>
                    <span className="font-semibold text-on-surface font-mono">{activeEntity.confidence}% • {activeEntity.source.slice(0, 18)}...</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase block font-sans">Last Verified Date</span>
                    <span className="font-semibold text-tertiary font-mono">
                      {new Date(activeEntity.lastVerifiedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Supporting Evidence List (All 5 Heuristics) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px]">fact_check</span>
                    Multivariate Supporting Evidence ({attributionResult.supportingEvidence.length} Signals)
                  </h4>
                  <span className="text-[10px] text-outline font-mono">Heuristic Evidence Weights</span>
                </div>

                <div className="space-y-2">
                  {attributionResult.supportingEvidence.map((ev, i) => (
                    <div
                      key={i}
                      className="bg-surface-container p-3 rounded border border-outline-variant flex justify-between items-start text-xs space-y-1"
                    >
                      <div className="space-y-1 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-surface-container-highest font-mono text-[9px] font-bold text-outline uppercase">
                            {ev.heuristic}
                          </span>
                          <span className="font-semibold text-on-surface">{ev.signalTitle}</span>
                          <span className="text-[10px] font-mono text-amber-300 font-semibold">
                            "{ev.qualification}"
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">
                          {ev.description}
                        </p>
                        {ev.txHash && (
                          <div className="text-[10px] font-mono text-outline">
                            TxHash: <span className="text-primary">{ev.txHash.slice(0, 22)}...</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                          {ev.confidenceScore}% Weight
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Known Cluster Endpoints Table */}
              {activeEntity && (
                <div className="space-y-2 pt-1 border-t border-outline-variant/40">
                  <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center justify-between">
                    <span>Verified Cluster Endpoints ({activeEntity.knownAddresses.length})</span>
                    <span className="text-[10px] text-outline font-normal">Source: {activeEntity.source}</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="bg-surface-container text-outline text-[10px] border-b border-outline-variant">
                          <th className="px-3 py-1.5">Known Address</th>
                          <th className="px-3 py-1.5">Role</th>
                          <th className="px-3 py-1.5">Verified Date</th>
                          <th className="px-3 py-1.5 text-right">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeEntity.knownAddresses.map((addr, idx) => (
                          <tr key={idx} className="border-b border-outline-variant/30 hover:bg-surface-variant">
                            <td className="px-3 py-1.5 text-primary break-all">{addr}</td>
                            <td className="px-3 py-1.5 text-on-surface">
                              {idx === 0 ? 'Primary Consolidation Vault' : idx === 1 ? 'Hot Deposit Router' : 'Cluster Transit Address'}
                            </td>
                            <td className="px-3 py-1.5 text-outline">
                              {new Date(activeEntity.lastVerifiedDate).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-1.5 text-right text-primary font-bold">
                              {activeEntity.confidence}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MANDATORY LEGAL STANDARD DISCLAIMER */}
              <div className="p-3 rounded bg-surface-container-lowest border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-400 text-[18px] shrink-0 mt-0.5">verified_user</span>
                <div className="space-y-0.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400 block">
                    Forensic Evidentiary Standard Notice (Non-Confirmed Ownership)
                  </span>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed font-mono">
                    {attributionResult.legalDisclaimer}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Subpoena Actions & Compliance Portal (4-col) */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <div className="surface-level-1 border border-outline-variant rounded-lg p-4 space-y-3.5 shadow-sm">
              <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">gavel</span>
                Subpoena & KYC Preservation Rails
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Because {activeEntity?.entityName || 'the attributed VASP'} enforces mandatory KYC compliance ({activeEntity?.metadata?.kycComplianceTier || 'Level 2+'}), customer identity records (Passport, IP logs, withdrawal destinations) are subpoena-accessible.
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-surface-container rounded border border-outline-variant space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-on-surface block">1. 18 U.S.C. § 2703(f) Preservation</span>
                    <span className="text-[10px] text-primary font-mono">90 Days</span>
                  </div>
                  <span className="text-[11px] text-outline block">Direct automated dispatch to {activeEntity?.metadata?.subpoenaPortal || 'VASP Compliance'}.</span>
                </div>
                <div className="p-2.5 bg-surface-container rounded border border-outline-variant space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-on-surface block">2. Hot Wallet Asset Freeze</span>
                    <span className="text-[10px] text-error font-mono">Urgent</span>
                  </div>
                  <span className="text-[11px] text-outline block">Freeze pending liquidation funds ($1,200,000 USDT) before off-ramp execution.</span>
                </div>
              </div>

              <button
                onClick={() => alert(`Subpoena packet for ${activeEntity?.entityName || 'Target VASP'} generated with probabilistic attribution exhibits.`)}
                className="w-full btn-primary py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download_for_offline</span>
                Generate Subpoena Package
              </button>
            </div>

            <div className="surface-level-1 border border-outline-variant rounded-lg p-4 space-y-2.5 shadow-sm text-xs">
              <span className="text-[10px] font-sans uppercase tracking-wider text-outline block">VASP Compliance Gateway</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-on-surface font-semibold">{activeEntity?.metadata?.subpoenaPortal || 'LERS Direct API'}</span>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              </div>
              <div className="text-[11px] text-outline">
                Jurisdiction: <span className="text-on-surface font-mono">{activeEntity?.metadata?.jurisdiction || 'Global'}</span>
              </div>
              <div className="text-[11px] text-outline">
                Avg LEA Turnaround: <span className="text-tertiary font-mono">{activeEntity?.metadata?.leaTurnaroundHours || 48} Hours</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Entity Directory View */
        <div className="surface-level-1 border border-outline-variant rounded-lg p-5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-outline-variant">
            <div>
              <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider">
                Entity Intelligence Knowledge Base Directory
              </h3>
              <p className="text-xs text-outline mt-0.5">
                Verified entity records with known infrastructure addresses, confidence scores, and compliance profiles.
              </p>
            </div>
            <span className="text-xs font-mono text-primary font-bold">
              {allEntities.length} Verified Entity Profiles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allEntities.map((ent, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-surface-container border border-outline-variant space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    ent.entityType === 'Mixer' || ent.entityType === 'Sanctioned Entity'
                      ? 'bg-error/20 text-error'
                      : ent.entityType === 'Bridge'
                      ? 'bg-cyan-400/20 text-cyan-300'
                      : ent.entityType === 'DEX'
                      ? 'bg-purple-400/20 text-purple-300'
                      : 'bg-primary/20 text-primary'
                  }`}>
                    {ent.entityType}
                  </span>
                  <span className="text-xs font-mono font-bold text-primary">
                    {ent.confidence}% Confidence
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-on-surface">{ent.entityName}</h4>
                  <div className="text-[11px] text-outline font-mono mt-0.5">
                    Source: {ent.source}
                  </div>
                </div>

                <div className="text-xs font-mono space-y-1 bg-surface-container-lowest p-2.5 rounded border border-outline-variant/40">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-outline">Chain:</span>
                    <span className="text-on-surface font-semibold">{ent.chain}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-outline">Known Endpoints:</span>
                    <span className="text-on-surface font-semibold">{ent.knownAddresses.length} Addresses</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-outline">Last Verified:</span>
                    <span className="text-tertiary">{new Date(ent.lastVerifiedDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTargetAddress(ent.knownAddresses[0]);
                    setActiveTab('attribution');
                  }}
                  className="w-full bg-surface-container-highest hover:bg-surface-variant text-on-surface py-1.5 px-2.5 rounded text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] text-primary">analytics</span>
                  <span>Evaluate Address Attribution</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
