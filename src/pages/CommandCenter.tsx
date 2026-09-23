import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SupabaseService } from '../services/supabaseService';

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<any[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadCases = async () => {
      try {
        const data = await SupabaseService.getCases();
        if (isMounted) {
          setCases(data || []);
        }
      } catch (err) {
        console.warn('Error loading CommandCenter cases:', err);
      } finally {
        if (isMounted) setLoadingCases(false);
      }
    };

    loadCases();
    return () => { isMounted = false; };
  }, []);

  const totalFundsTraced = cases.reduce((acc, c) => acc + (Number(c.reportedAmountUsd) || 0), 0);
  const criticalCasesCount = cases.filter(c => c.priority === 'critical' || c.priority === 'high').length;
  const uniqueTargetsCount = new Set(cases.map(c => c.targetAddress).filter(Boolean)).size;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-end pb-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface m-0 p-0 leading-tight tracking-tight">
            Command Center
          </h2>
          <p className="text-on-surface-variant mt-2 text-sm">
            Overview of active investigations and system intelligence
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => alert('Command Center summary data exported to CSV.')}
            className="px-4 py-1.5 bg-transparent text-on-surface rounded text-xs font-semibold flex items-center gap-2 hover:bg-surface-variant transition-colors border border-outline-variant focus:ring-2 focus:ring-outline"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export
          </button>
          <button
            onClick={() => navigate('/investigations/new')}
            className="px-4 py-1.5 bg-primary-container text-on-primary-container rounded text-xs font-semibold flex items-center gap-2 hover:bg-primary-container/90 transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-background shadow-sm border border-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            New Investigation
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Top Row: Hero Stats */}
        <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1 - Funds Traced */}
          <div className="bg-surface-bright rounded-2xl p-5 flex flex-col justify-between h-[130px] border border-outline-variant/40 shadow-sm hover:shadow transition-shadow">
            <div className="flex justify-between items-start">
              <p className="font-sans text-on-surface-variant text-sm font-medium">
                Total Reported Loss Traced
              </p>
              <span className="material-symbols-outlined text-primary text-[20px] bg-primary/10 p-1.5 rounded-lg">payments</span>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-on-surface leading-none font-mono tracking-tight mb-2.5">
                ${totalFundsTraced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-primary">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span className="font-medium">Active cases ledger</span>
              </div>
            </div>
          </div>

          {/* Stat 2 - Active Investigations */}
          <div className="bg-surface-bright rounded-2xl p-5 flex flex-col justify-between h-[130px] border border-outline-variant/40 shadow-sm hover:shadow transition-shadow">
            <div className="flex justify-between items-start">
              <p className="font-sans text-on-surface-variant text-sm font-medium">
                Active Investigations
              </p>
              <span className="material-symbols-outlined text-tertiary text-[20px] bg-tertiary/10 p-1.5 rounded-lg">folder_open</span>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-on-surface leading-none font-mono mb-2.5">
                {cases.length} Cases
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="font-medium">{criticalCasesCount} high/critical priority</span>
              </div>
            </div>
          </div>

          {/* Stat 3 - High-Risk Wallets */}
          <div className="bg-surface-bright rounded-2xl p-5 flex flex-col justify-between h-[130px] border border-outline-variant/40 shadow-sm hover:shadow transition-shadow">
            <div className="flex justify-between items-start">
              <p className="font-sans text-on-surface-variant text-sm font-medium">
                Monitored Targets
              </p>
              <span className="material-symbols-outlined text-error text-[20px] bg-error/10 p-1.5 rounded-lg">warning</span>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-error leading-none font-mono mb-2.5">
                {uniqueTargetsCount} Targets
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-error">
                <span className="material-symbols-outlined text-[14px]">radar</span>
                <span className="font-medium">Under active surveillance</span>
              </div>
            </div>
          </div>

          {/* Stat 4 - VASP Matches */}
          <div className="bg-surface-bright rounded-2xl p-5 flex flex-col justify-between h-[130px] border border-outline-variant/40 shadow-sm hover:shadow transition-shadow">
            <div className="flex justify-between items-start">
              <p className="font-sans text-on-surface-variant text-sm font-medium">
                VASP Directory Linkage
              </p>
              <span className="material-symbols-outlined text-secondary text-[20px] bg-secondary/10 p-1.5 rounded-lg">business</span>
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-on-surface leading-none font-mono mb-2.5">
                Multi-VASP
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant">
                <span className="font-medium">EIL Entity Matching Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* National Cybercrime & SAHYOG Quick-Link Banner */}
        <div className="col-span-12 surface-level-1 rounded-md p-4 border border-outline-variant shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">hub</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-on-surface">National LEA Coordination Active: NCRP & SAHYOG</h4>
                <span className="bg-primary-container text-on-primary-container text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                  1930 / I4C / BNSS
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Ingested NCRP Complaints • Active SAHYOG Sec 94/107 BNSS Notices • Rapid 1930 CFCFRMS Freeze Directives.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/ncrp-sahyog?tab=ncrp')}
              className="btn-secondary px-3 py-1.5 text-xs rounded flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">report</span>
              <span>NCRP Tickets</span>
            </button>
            <button
              onClick={() => navigate('/ncrp-sahyog?tab=sahyog')}
              className="btn-primary px-3 py-1.5 text-xs rounded font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">gavel</span>
              <span>SAHYOG Notices</span>
            </button>
          </div>
        </div>

        {/* Middle Row: Recent Cases Table (8-col) + AI Insights (4-col) */}
        <div className="col-span-12 lg:col-span-8 bg-surface-bright rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">troubleshoot</span>
              Active Investigations
            </h3>
            <button
              onClick={() => navigate('/investigations/new')}
              className="text-sm text-primary hover:underline font-medium"
            >
              + Create Case →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="px-6 py-3 text-xs font-sans text-on-surface-variant font-medium">Case ID</th>
                  <th className="px-6 py-3 text-xs font-sans text-on-surface-variant font-medium">Target Wallet</th>
                  <th className="px-6 py-3 text-xs font-sans text-on-surface-variant font-medium">Type</th>
                  <th className="px-6 py-3 text-xs font-sans text-on-surface-variant font-medium">Risk</th>
                  <th className="px-6 py-3 text-xs font-sans text-on-surface-variant font-medium">Status</th>
                  <th className="px-6 py-3 text-xs font-sans text-on-surface-variant font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loadingCases ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant font-mono text-xs">
                      Loading investigations from database...
                    </td>
                  </tr>
                ) : cases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant font-mono text-xs">
                      No active investigations recorded. Click '+ New Investigation' above to initialize a case.
                    </td>
                  </tr>
                ) : cases.map((row, i) => {
                  const id = row.caseId || row.id;
                  const wallet = row.targetAddress || 'N/A';
                  const type = (row.fraudType || 'other').replace(/_/g, ' ');
                  const risk = (row.priority || 'medium').toUpperCase();
                  const status = (row.status || 'active').replace(/_/g, ' ');
                  const amount = row.reportedAmountUsd ? `$${Number(row.reportedAmountUsd).toLocaleString()}` : '$0';

                  return (
                    <tr
                      key={id || i}
                      onClick={() => navigate(`/graph/${id}`)}
                      className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-primary font-semibold group-hover:underline">{id}</td>
                      <td
                        onClick={(e) => {
                          if (wallet && wallet !== 'N/A') {
                            e.stopPropagation();
                            navigate(`/wallet/${wallet}`);
                          }
                        }}
                        className="px-4 py-2.5 font-mono text-on-surface-variant hover:text-primary"
                      >
                        {wallet.length > 14 ? `${wallet.slice(0, 8)}...${wallet.slice(-6)}` : wallet}
                      </td>
                      <td className="px-4 py-2.5 text-on-surface capitalize">{type}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono ${risk === 'CRITICAL' ? 'bg-error/20 text-error' :
                          risk === 'HIGH' ? 'bg-error/10 text-error' :
                            'bg-tertiary/10 text-tertiary'
                          }`}>{risk}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${status === 'active' ? 'bg-primary/10 text-primary' :
                          status === 'escalated' ? 'bg-error/10 text-error' :
                            'bg-surface-variant text-on-surface-variant'
                          }`}>{status}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-on-surface font-medium">{amount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Quick Insights Panel */}
        <div className="col-span-12 lg:col-span-4 bg-surface-bright rounded-2xl border border-outline-variant/40 shadow-sm p-6 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
              AI Investigator Insights
            </h3>
            <div className="space-y-2.5">
              {[
                { icon: 'warning', color: 'text-error', text: 'Wallet 0x71C...976F shows layering pattern consistent with pig butchering. 3 intermediary hops detected before exchange deposit.' },
                { icon: 'cyclone', color: 'text-tertiary', text: 'Unusual spike in Tornado Cash interactions from cluster bc1q...x89 in the last 48 hours. Recommend monitoring escalation.' },
                { icon: 'verified', color: 'text-primary', text: 'VASP attribution confidence for Binance cluster increased to 98.5% based on new deposit address confirmation.' },
              ].map((insight, i) => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/50 rounded p-3 flex gap-2.5">
                  <span className={`material-symbols-outlined text-[16px] ${insight.color} shrink-0 mt-0.5`}>{insight.icon}</span>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate('/graph/INV-2023-0842')}
            className="w-full bg-surface-container border border-outline-variant text-on-surface py-2 px-3 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[14px] text-primary">account_tree</span>
            Analyze Full Forensic Graph
          </button>
        </div>

        {/* Bottom Row: Recent Alerts (6-col) + Watchlist (6-col) */}
        <div className="col-span-12 lg:col-span-6 bg-surface-bright rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-error">notifications_active</span>
              Recent Alerts
            </h3>
            <span onClick={() => navigate('/alerts')} className="bg-error-container text-error text-[10px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer">
              3 NEW (View All)
            </span>
          </div>
          <div className="flex flex-col">
            {[
              { type: 'HIGH_VALUE_TRANSFER', time: '2 min ago', desc: '1.2M USDT transferred to probable Binance cluster', severity: 'critical' },
              { type: 'MIXER_EXPOSURE', time: '18 min ago', desc: 'Tornado Cash interaction detected from 0x9c...11fa', severity: 'high' },
              { type: 'LAYERING_DETECTED', time: '1 hr ago', desc: '4-hop rapid forwarding pattern on case INV-0842', severity: 'high' },
            ].map((alert, i) => (
              <div
                key={i}
                onClick={() => navigate('/alerts')}
                className="flex items-start gap-3 px-4 py-3 border-b border-outline-variant/30 hover:bg-surface-variant transition-colors cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[16px] mt-0.5 ${alert.severity === 'critical' ? 'text-error' : 'text-tertiary'
                  }`}>error</span>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-sans text-outline uppercase tracking-wider">{alert.type.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-outline font-mono">{alert.time}</span>
                  </div>
                  <p className="text-[12px] text-on-surface mt-1">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monitored Wallets */}
        <div className="col-span-12 lg:col-span-6 bg-surface-bright rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">monitor_heart</span>
              Active Watchlist
            </h3>
            <span onClick={() => navigate('/monitoring')} className="text-sm text-primary hover:underline cursor-pointer font-medium">
              Manage Watchlist (6) →
            </span>
          </div>
          <div className="flex flex-col">
            {[
              { addr: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', chain: 'ETH', lastTx: '2 min ago', risk: 92 },
              { addr: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', chain: 'BTC', lastTx: '34 min ago', risk: 87 },
              { addr: '0x8F5A6b738914c17228Ac94B692095f9733072dE4', chain: 'ETH', lastTx: '2 hrs ago', risk: 64 },
            ].map((w, i) => (
              <div
                key={i}
                onClick={() => navigate(`/wallet/${w.addr}`)}
                className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/30 hover:bg-surface-variant transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <div>
                    <div className="font-mono text-[12px] text-on-surface">{w.addr.slice(0, 10)}...{w.addr.slice(-8)}</div>
                    <div className="text-[10px] text-outline">{w.chain} • Last tx: {w.lastTx}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${w.risk >= 80 ? 'bg-error/20 text-error' : 'bg-tertiary/10 text-tertiary'
                  }`}>Risk: {w.risk}/100</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
