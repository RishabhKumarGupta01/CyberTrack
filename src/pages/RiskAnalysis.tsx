import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { riskEngine } from '../risk/RiskEngine';
import { RiskAssessmentResult, RiskLevel } from '../risk/types';
import { blockchainRegistry } from '../blockchain/AdapterRegistry';
import { SupabaseService } from '../services/supabaseService';
import { Case } from '../types';

export const RiskAnalysis: React.FC = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();

  // Active cases from Supabase
  const [activeCases, setActiveCases] = useState<Case[]>([]);

  // Target address under evaluation
  const [currentWallet, setCurrentWallet] = useState<string>(walletId || '');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isLoadingTxs, setIsLoadingTxs] = useState<boolean>(false);
  const [realTransactions, setRealTransactions] = useState<any[]>([]);
  const [detectedChain, setDetectedChain] = useState<string>('Ethereum');

  // Load real active cases from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const loadCases = async () => {
      try {
        const fetched = await SupabaseService.getCases();
        if (isMounted && fetched && fetched.length > 0) {
          setActiveCases(fetched);
          if (!walletId && !currentWallet) {
            setCurrentWallet(fetched[0].targetAddress || '');
          }
        }
      } catch (err) {
        console.warn('Could not load cases for risk analysis presets:', err);
      }
    };
    loadCases();
    return () => {
      isMounted = false;
    };
  }, [walletId]);

  // Fetch real on-chain transactions when currentWallet changes
  useEffect(() => {
    const trimmed = currentWallet.trim();
    if (!trimmed) {
      setRealTransactions([]);
      return;
    }

    const adapter = blockchainRegistry.detectAdapterForAddress(trimmed);
    if (adapter) {
      setDetectedChain(adapter.blockchain);
      setIsLoadingTxs(true);
      adapter.get_transactions(trimmed, { limit: 25 })
        .then((txs) => {
          setRealTransactions(txs || []);
          setIsLoadingTxs(false);
        })
        .catch((err) => {
          console.warn(`Failed to fetch on-chain transactions for ${trimmed}:`, err);
          setRealTransactions([]);
          setIsLoadingTxs(false);
        });
    } else {
      setDetectedChain('Ethereum');
      setRealTransactions([]);
    }
  }, [currentWallet]);

  // Dynamic Risk Evaluation via RiskEngine on REAL on-chain data
  const assessment: RiskAssessmentResult = useMemo(() => {
    const trimmed = currentWallet.trim();
    if (!trimmed) {
      return riskEngine.assessRisk({
        target_address: '0x0000000000000000000000000000000000000000',
        blockchain: detectedChain,
        transactions: [],
      });
    }

    // Format real transactions into RiskEngineInput format
    const formattedTxs = realTransactions.map((tx) => {
      const fromAddr = (tx.from || tx.from_address || '').trim();
      const toAddr = (tx.to || tx.to_address || '').trim();
      const valStr = String(tx.value || tx.amount || '0');
      const valNum = parseFloat(valStr) || 0;
      const isOut = fromAddr.toLowerCase() === trimmed.toLowerCase();

      return {
        tx_hash: tx.hash || tx.tx_hash || '',
        from_address: fromAddr,
        to_address: toAddr,
        amount: valStr,
        amount_usd: tx.amount_usd || (valNum * 3000) || 0,
        asset: tx.assetSymbol || tx.asset || 'NATIVE',
        timestamp: tx.timestamp || Math.floor(Date.now() / 1000),
        block_number: tx.blockNumber || tx.block_number || 0,
        direction: (tx.direction || (isOut ? 'outgoing' : 'incoming')) as 'incoming' | 'outgoing',
      };
    });

    // Calculate real velocity metrics from live transactions
    const nowSec = Math.floor(Date.now() / 1000);
    const txCount1h = formattedTxs.filter((tx) => (nowSec - tx.timestamp) <= 3600).length;
    const txCount24h = formattedTxs.filter((tx) => (nowSec - tx.timestamp) <= 86400).length;

    return riskEngine.assessRisk({
      target_address: trimmed,
      blockchain: detectedChain,
      transactions: formattedTxs,
      velocity_metrics: {
        tx_count_last_1h: txCount1h,
        tx_count_last_24h: txCount24h,
        burst_transactions: txCount1h,
      },
    });
  }, [currentWallet, realTransactions, detectedChain]);

  // Filtered list of risk factors
  const filteredFactors = useMemo(() => {
    if (severityFilter === 'all') return assessment.risk_factors;
    return assessment.risk_factors.filter(
      f => f.severity.toLowerCase() === severityFilter.toLowerCase()
    );
  }, [assessment.risk_factors, severityFilter]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 select-none">
      {/* Top Header */}
      <div className="flex justify-between items-end border-b border-outline-variant pb-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] mb-1">
            <span className="font-sans text-outline uppercase tracking-widest">Analysis Engine</span>
            <span className="text-outline">/</span>
            <span className="font-sans text-primary uppercase tracking-widest">Explainable Risk Scoring</span>
          </div>
          <h2 className="text-xl font-semibold text-on-surface leading-tight tracking-tight flex items-center gap-2.5">
            <span className="material-symbols-outlined text-error text-[24px]">shield</span>
            Explainable Risk Scoring Engine (0–100)
          </h2>
          <p className="text-on-surface-variant mt-0.5 text-xs">
            Multi-indicator quantitative risk scoring evaluating 9 on-chain behavioral and topological exposure signals with transparent evidentiary explainability.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => currentWallet && navigate(`/wallet/${currentWallet}`)}
            disabled={!currentWallet}
            className="btn-secondary px-3.5 py-1.5 text-xs rounded flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
            Wallet Intelligence
          </button>
          <button
            onClick={() => {
              const matchedCase = activeCases.find(c => c.targetAddress?.toLowerCase() === currentWallet.toLowerCase());
              navigate(matchedCase ? `/graph/${matchedCase.caseId}` : `/graph`);
            }}
            className="btn-primary px-3.5 py-1.5 text-xs rounded font-semibold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">account_tree</span>
            View in Forensic Graph
          </button>
        </div>
      </div>

      {/* Target Address Selector Bar */}
      <div className="surface-level-1 border border-outline-variant rounded-lg p-3 space-y-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">search</span>
          <span className="text-xs font-semibold text-on-surface uppercase tracking-wide">Target Wallet Address:</span>
          <input
            type="text"
            value={currentWallet}
            onChange={(e) => setCurrentWallet(e.target.value.trim())}
            placeholder="Enter real blockchain address (Ethereum, Bitcoin, Solana, TRON, Avalanche)..."
            className="flex-1 bg-surface-container border border-outline-variant rounded px-3 py-1.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
          />
          {isLoadingTxs && (
            <span className="text-[11px] font-mono text-primary flex items-center gap-1 px-2">
              <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
              Querying on-chain...
            </span>
          )}
        </div>

        {/* Active Case Quick-Selection Chips */}
        {activeCases.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] pt-1 border-t border-outline-variant/30 flex-wrap">
            <span className="text-outline uppercase tracking-wider font-sans text-[10px] mr-1">Active Cases:</span>
            {activeCases.map((c) => (
              <button
                key={c.caseId || c.id}
                onClick={() => setCurrentWallet(c.targetAddress)}
                className={`px-2.5 py-0.5 rounded border text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                  currentWallet.toLowerCase() === c.targetAddress?.toLowerCase()
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

      {/* Hero 4-Card Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Composite Risk Score Card */}
        <div className="surface-level-1 border border-outline-variant rounded-lg p-4 flex items-center gap-3.5 shadow-sm">
          <div className={`w-18 h-18 rounded-full border-4 flex flex-col items-center justify-center shrink-0 ${
            assessment.risk_level === 'CRITICAL' ? 'border-error bg-error/10 text-error' :
            assessment.risk_level === 'HIGH' ? 'border-amber-400 bg-amber-400/10 text-amber-300' :
            assessment.risk_level === 'MEDIUM' ? 'border-tertiary bg-tertiary/10 text-tertiary' :
            'border-primary bg-primary/10 text-primary'
          }`}>
            <span className="text-2xl font-extrabold font-mono">{assessment.risk_score}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider">/ 100</span>
          </div>
          <div>
            <span className="text-[10px] font-sans text-outline uppercase tracking-wider block">Composite Risk Score</span>
            <span className={`text-sm font-bold uppercase font-mono ${
              assessment.risk_level === 'CRITICAL' ? 'text-error' :
              assessment.risk_level === 'HIGH' ? 'text-amber-300' :
              assessment.risk_level === 'MEDIUM' ? 'text-tertiary' : 'text-primary'
            }`}>
              {assessment.risk_level} SEVERITY
            </span>
            <span className="text-[10px] text-outline block mt-0.5 font-mono">
              {assessment.risk_factors.length} active indicator(s)
            </span>
          </div>
        </div>

        {/* 2. CRITICAL SEPARATION CARD: Risk Score vs VASP Attribution Confidence */}
        <div className="surface-level-1 border border-primary/40 rounded-lg p-4 flex flex-col justify-between shadow-sm bg-primary/5">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-sans text-primary uppercase font-bold tracking-wider">
              VASP Attribution Confidence
            </span>
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-primary font-mono">
                {assessment.metric_separation.vasp_attribution_confidence}%
              </span>
              <span className="text-[10px] text-outline font-mono">
                {assessment.metric_separation.attributed_entity_name || 'Unattributed'}
              </span>
            </div>
            <span className="text-[10px] text-primary/80 font-sans block mt-0.5">
              Distinct Metric (Identity ≠ Risk)
            </span>
          </div>
        </div>

        {/* 3. Active Threat Drivers */}
        <div className="surface-level-1 border border-outline-variant rounded-lg p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-sans text-outline uppercase tracking-wider">Primary Risk Drivers</span>
            <span className="material-symbols-outlined text-error text-[18px]">bolt</span>
          </div>
          <div>
            <span className="text-xl font-bold text-on-surface font-mono">
              {assessment.risk_factors.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length} Critical / High
            </span>
            <span className="text-[10px] text-outline block mt-0.5 font-mono">
              {assessment.risk_factors.reduce((acc, f) => acc + f.score_impact, 0)} Raw Indicator Points
            </span>
          </div>
        </div>

        {/* 4. Target Blockchain Profile */}
        <div className="surface-level-1 border border-outline-variant rounded-lg p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-sans text-outline uppercase tracking-wider">Network & Evaluation</span>
            <span className="material-symbols-outlined text-tertiary text-[18px]">lan</span>
          </div>
          <div>
            <span className="text-base font-bold text-on-surface font-mono">{assessment.blockchain}</span>
            <span className="text-[10px] text-outline block mt-0.5 font-mono">
              Evaluated: {new Date(assessment.assessed_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* METRIC SEPARATION PRINCIPLE BANNER (Required Architectural Contrast) */}
      <div className="p-3.5 bg-surface-container rounded-lg border border-primary/30 flex items-start gap-3 text-xs">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">balance</span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-primary uppercase font-mono tracking-wider">
              Metric Separation Principle (Risk Score vs VASP Attribution Confidence)
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            <strong className="text-on-surface">RISK SCORE ({assessment.risk_score}/100)</strong> measures <em>behavioral suspiciousness and money laundering indicators</em> (mixers, layering velocity, rapid sweeps, structuring).
            In contrast, <strong className="text-primary">VASP ATTRIBUTION CONFIDENCE ({assessment.metric_separation.vasp_attribution_confidence}%)</strong> measures <em>institutional identification certainty</em> (whether an address interacts with a compliant exchange).
            These are completely orthogonal metrics: an address can have near-zero risk while having high VASP confidence (e.g. an official exchange hot wallet), or high risk while depositing into a high-confidence VASP sub-account.
          </p>
        </div>
      </div>

      {/* Explainable Narrative Synthesis Box */}
      <div className="surface-level-1 border border-outline-variant rounded-lg p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant pb-2">
          <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
            Automated Explainability Synthesis (Forensic Narrative)
          </h3>
          <span className="text-[10px] font-mono text-outline">Court-Admissible Explanation</span>
        </div>
        <div className="p-3.5 bg-surface-container rounded border border-outline-variant/60 text-xs text-on-surface leading-relaxed font-sans whitespace-pre-line">
          {assessment.explanation}
        </div>
      </div>

      {/* Explainable Risk Indicators Table (All 9 Potential Indicators) */}
      <div className="surface-level-1 border border-outline-variant rounded-lg overflow-hidden shadow-sm space-y-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant bg-surface-container-lowest">
          <div>
            <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-error text-[16px]">rule</span>
              Active Risk Factors & Evidentiary Weights ({filteredFactors.length})
            </h3>
            <p className="text-[10px] text-outline mt-0.5">Factor-by-factor breakdown of evaluated potential indicators contributing to composite score.</p>
          </div>
          <div className="flex gap-1.5">
            {['all', 'critical', 'high', 'medium'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSeverityFilter(lvl)}
                className={`px-2.5 py-1 rounded text-[10px] font-sans uppercase font-bold transition-colors cursor-pointer ${
                  severityFilter === lvl
                    ? 'bg-primary text-on-primary-container'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {filteredFactors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-container text-outline text-[10px] font-sans uppercase tracking-wider border-b border-outline-variant">
                  <th className="px-5 py-2.5">Indicator Code</th>
                  <th className="px-5 py-2.5">Factor Name & Plain-English Rationale</th>
                  <th className="px-5 py-2.5">Severity</th>
                  <th className="px-5 py-2.5 text-right">Score Impact</th>
                  <th className="px-5 py-2.5">Verifiable Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredFactors.map((f, i) => (
                  <tr key={i} className="border-b border-outline-variant/30 hover:bg-surface-variant/40 transition-colors">
                    <td className="px-5 py-3 font-mono text-primary font-bold text-[11px] whitespace-nowrap">
                      {f.indicator}
                    </td>
                    <td className="px-5 py-3 space-y-0.5">
                      <div className="font-semibold text-on-surface text-xs">{f.name}</div>
                      <div className="text-[11px] text-outline leading-relaxed max-w-xl">{f.description}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        f.severity === 'CRITICAL' ? 'bg-error/20 text-error' :
                        f.severity === 'HIGH' ? 'bg-amber-400/20 text-amber-300' :
                        'bg-tertiary/20 text-tertiary'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-error font-bold text-right text-xs whitespace-nowrap">
                      +{f.score_impact} pts
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-primary">
                      {f.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-outline text-xs">
            No risk factors match the selected filter.
          </div>
        )}
      </div>

      {/* MANDATORY LEGAL DISCLAIMER (Non-Guilt Standard) */}
      <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-outline text-xs flex items-start gap-2.5">
        <span className="material-symbols-outlined text-outline text-[18px] shrink-0 mt-0.5">gavel</span>
        <div className="space-y-0.5">
          <span className="font-bold uppercase tracking-wider text-[10px] text-on-surface block">
            Evidentiary Standard Notice (Non-Guilt & Non-Criminal Ownership Standard)
          </span>
          <p className="text-[11px] text-outline font-mono leading-relaxed">
            {assessment.legal_disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
};
