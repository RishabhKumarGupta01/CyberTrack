import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WatchlistManager } from '../monitoring/WatchlistManager';
import {
  MonitoredWallet,
  MonitoringAlert,
  MonitoringAlertType,
  WatchlistStatus,
} from '../monitoring/types';
import {
  WebSocketSubscriptionProvider,
  PollingSubscriptionProvider,
} from '../monitoring/SubscriptionProvider';
import { SupabaseService } from '../services/supabaseService';
import { Case } from '../types';

export const RealTimeMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const manager = WatchlistManager.getInstance();

  // Active cases from Supabase
  const [activeCases, setActiveCases] = useState<Case[]>([]);

  // State
  const [wallets, setWallets] = useState<MonitoredWallet[]>(manager.getWallets());
  const [alerts, setAlerts] = useState<MonitoringAlert[]>(manager.getAlerts());
  const [selectedAlertType, setSelectedAlertType] = useState<string>('ALL');
  const [selectedCase, setSelectedCase] = useState<string>('ALL');
  const [isLiveStreamActive, setIsLiveStreamActive] = useState<boolean>(true);
  const [currentProviderType, setCurrentProviderType] = useState<'polling' | 'websocket'>('polling');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Form State for Add Wallet
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newCaseId, setNewCaseId] = useState('');
  const [newChain, setNewChain] = useState('Ethereum');
  const [newLabel, setNewLabel] = useState('');
  const [newThreshold, setNewThreshold] = useState('10000');

  // Load real active cases from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    const loadCases = async () => {
      try {
        const fetched = await SupabaseService.getCases();
        if (isMounted && fetched && fetched.length > 0) {
          setActiveCases(fetched);
          setNewCaseId(fetched[0].caseId);
        }
      } catch (err) {
        console.warn('Failed to load active cases in RealTimeMonitoring:', err);
      }
    };
    loadCases();
    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to real-time alerts and wallet changes
  useEffect(() => {
    const unsubAlerts = manager.onAlert((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    const unsubWallets = manager.onWalletsChange((updatedWallets) => {
      setWallets([...updatedWallets]);
    });

    return () => {
      unsubAlerts();
      unsubWallets();
    };
  }, [manager]);

  // Provider switching handler
  const handleProviderSwitch = async (type: 'polling' | 'websocket') => {
    setCurrentProviderType(type);
    if (type === 'websocket') {
      await manager.setSubscriptionProvider(new WebSocketSubscriptionProvider());
    } else {
      await manager.setSubscriptionProvider(new PollingSubscriptionProvider({ intervalMs: 5000 }));
    }
  };

  // Toggle wallet status
  const handleToggleStatus = (address: string, currentStatus: WatchlistStatus) => {
    const nextStatus: WatchlistStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    manager.updateWalletStatus(address, nextStatus);
  };

  // Remove wallet
  const handleRemoveWallet = (address: string) => {
    if (confirm(`Remove ${address} from active surveillance watchlist?`)) {
      manager.removeWallet(address);
    }
  };

  // Add wallet submit
  const handleAddWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletAddress.trim()) return;

    manager.addWallet({
      wallet: newWalletAddress.trim(),
      case: newCaseId.trim(),
      chain: newChain,
      label: newLabel.trim() || 'Monitored Target',
      status: 'ACTIVE',
      alert_threshold_usd: parseFloat(newThreshold) || 10000,
    });

    setIsAddModalOpen(false);
    setNewWalletAddress('');
    setNewLabel('');
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = (alertId: string) => {
    manager.acknowledgeAlert(alertId, 'Special Agent (Current Session)');
    setAlerts([...manager.getAlerts()]);
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    if (selectedAlertType !== 'ALL' && a.alert_type !== selectedAlertType) return false;
    if (selectedCase !== 'ALL' && a.case !== selectedCase) return false;
    return true;
  });

  const activeWalletsCount = wallets.filter((w) => w.status === 'ACTIVE').length;
  const criticalAlertsCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const unacknowledgedCount = alerts.filter((a) => !a.is_acknowledged).length;

  const alertTypologyOptions: Array<{ id: string; label: string; icon: string }> = [
    { id: 'ALL', label: 'All Alerts', icon: 'notifications' },
    { id: 'NEW_TRANSACTION', label: 'New Transaction', icon: 'sync_alt' },
    { id: 'HIGH_VALUE_TRANSFER', label: 'High-Value Transfer', icon: 'payments' },
    { id: 'RAPID_FORWARDING', label: 'Rapid Forwarding', icon: 'fast_forward' },
    { id: 'LAYERING_DETECTED', label: 'Layering Detected', icon: 'layers' },
    { id: 'CROSS_CHAIN_ACTIVITY', label: 'Cross-Chain Activity', icon: 'swap_calls' },
    { id: 'HIGH_RISK_ENTITY', label: 'High-Risk Entity', icon: 'warning' },
    { id: 'MIXER_EXPOSURE', label: 'Mixer Exposure', icon: 'blender' },
    { id: 'EXCHANGE_DEPOSIT', label: 'Exchange Deposit', icon: 'account_balance' },
  ];

  return (
    <div className="max-w-[1680px] mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-outline-variant pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] mb-1">
            <span className="font-sans text-outline uppercase tracking-widest">Surveillance Operations</span>
            <span className="text-outline">/</span>
            <span className="font-sans text-primary uppercase tracking-widest">Live Watchlist & Alerts</span>
          </div>
          <h2 className="text-[22px] font-semibold text-on-surface leading-tight tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[26px]">radar</span>
            Real-Time Blockchain Watchlist & Automated Surveillance
          </h2>
          <p className="text-on-surface-variant mt-1 text-xs max-w-3xl">
            Live event-driven mempool and on-chain monitoring of suspect wallets. Evaluates incoming transactions against 8 distinct forensic typologies with immediate alert dispatch.
          </p>
        </div>

        {/* Action Controls & Provider Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Provider Selector */}
          <div className="flex items-center bg-surface-container border border-outline-variant rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => handleProviderSwitch('polling')}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentProviderType === 'polling' ? 'bg-primary/20 text-primary font-bold' : 'text-outline hover:text-on-surface'
              }`}
              title="Scheduled Indexer Polling (5s)"
            >
              RPC POLLER
            </button>
            <button
              onClick={() => handleProviderSwitch('websocket')}
              className={`px-2.5 py-1 rounded transition-colors ${
                currentProviderType === 'websocket' ? 'bg-primary/20 text-primary font-bold' : 'text-outline hover:text-on-surface'
              }`}
              title="Connect to Live JSON-RPC WebSocket (wss://)"
            >
              WEBSOCKET
            </button>
          </div>

          {/* Stream Connection Indicator */}
          <button
            onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
            className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-2 border transition-colors ${
              isLiveStreamActive
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-surface-container text-outline border-outline-variant'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveStreamActive ? 'bg-primary animate-pulse' : 'bg-outline'}`}></span>
            {isLiveStreamActive ? `${currentProviderType.toUpperCase()} ACTIVE` : 'FEED PAUSED'}
          </button>

          {/* Add Monitored Wallet Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary px-3.5 py-1.5 text-xs rounded font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Add Monitored Wallet
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-level-1 border border-outline-variant rounded-lg p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] text-outline font-sans uppercase tracking-wider">Monitored Targets</div>
            <div className="text-2xl font-bold font-mono text-on-surface mt-1">{wallets.length}</div>
            <div className="text-[11px] text-primary flex items-center gap-1 mt-0.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              {activeWalletsCount} Active Surveillance
            </div>
          </div>
          <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-22px">wallet</span>
          </div>
        </div>

        <div className="surface-level-1 border border-outline-variant rounded-lg p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] text-outline font-sans uppercase tracking-wider">Unacknowledged Alerts</div>
            <div className="text-2xl font-bold font-mono text-error mt-1">{unacknowledgedCount}</div>
            <div className="text-[11px] text-error flex items-center gap-1 mt-0.5 font-mono">
              {criticalAlertsCount} Critical Severity
            </div>
          </div>
          <div className="w-11 h-11 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-22px">warning</span>
          </div>
        </div>

        <div className="surface-level-1 border border-outline-variant rounded-lg p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] text-outline font-sans uppercase tracking-wider">Subscription Protocol</div>
            <div className="text-lg font-bold font-mono text-on-surface mt-1 uppercase">
              {currentProviderType === 'websocket' ? 'JSON-RPC 2.0 WSS' : 'REST Indexer / RPC Polling'}
            </div>
            <div className="text-[11px] text-on-surface-variant font-mono mt-0.5">
              Heartbeat: 30s | Reconnect: Auto
            </div>
          </div>
          <div className="w-11 h-11 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-22px">hub</span>
          </div>
        </div>

        <div className="surface-level-1 border border-outline-variant rounded-lg p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] text-outline font-sans uppercase tracking-wider">Automated Typologies</div>
            <div className="text-2xl font-bold font-mono text-tertiary mt-1">8/8 Active</div>
            <div className="text-[11px] text-on-surface-variant font-mono mt-0.5">
              Mixer • Bridge • Peeling • HVT
            </div>
          </div>
          <div className="w-11 h-11 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-22px">rule</span>
          </div>
        </div>
      </div>

      {/* Main Content: Split Grid (Watchlist Table & Alert Feed) */}
      <div className="space-y-6">
        {/* ==================================================================== */}
        {/* 1. MONITORED WALLETS TABLE (Includes: wallet, case, status, last_checked, last_transaction) */}
        {/* ==================================================================== */}
        <div className="surface-level-1 border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-3.5 border-b border-outline-variant bg-surface-container-lowest gap-2">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[16px]">visibility</span>
                Surveillance Watchlist ({wallets.length} Target Wallets)
              </h3>
              <span className="text-[11px] font-mono text-outline">
                All 5 Mandated Records: [wallet, case, status, last_checked, last_transaction]
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-outline">
              <span>Filter Case:</span>
              <select
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className="bg-surface-container border border-outline-variant text-on-surface rounded px-2 py-0.5 text-xs font-mono"
              >
                <option value="ALL">All Active Cases</option>
                {activeCases.map((c) => (
                  <option key={c.caseId || c.id} value={c.caseId}>
                    {c.caseId} — {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-surface-container text-outline text-[10px] uppercase tracking-wider border-b border-outline-variant">
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Target Wallet</th>
                  <th className="px-5 py-3">Associated Case</th>
                  <th className="px-5 py-3">Last Checked</th>
                  <th className="px-5 py-3">Last Transaction Detected</th>
                  <th className="px-5 py-3">Risk Rating</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets
                  .filter((w) => selectedCase === 'ALL' || w.case === selectedCase)
                  .map((w, idx) => {
                    const isIncoming = w.last_transaction?.direction === 'INCOMING';

                    return (
                      <tr
                        key={idx}
                        className="border-b border-outline-variant/30 hover:bg-surface-variant/40 transition-colors"
                      >
                        {/* 1. STATUS */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(w.wallet, w.status)}
                            className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                            title="Click to toggle ACTIVE / PAUSED"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                w.status === 'ACTIVE'
                                  ? 'bg-primary animate-pulse'
                                  : w.status === 'PAUSED'
                                  ? 'bg-yellow-500'
                                  : 'bg-outline'
                              }`}
                            ></span>
                            <span
                              className={
                                w.status === 'ACTIVE'
                                  ? 'text-primary'
                                  : w.status === 'PAUSED'
                                  ? 'text-yellow-500'
                                  : 'text-outline'
                              }
                            >
                              {w.status}
                            </span>
                          </button>
                        </td>

                        {/* 2. WALLET */}
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col">
                            <span
                              onClick={() => navigate(`/wallet/${w.wallet}`)}
                              className="text-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                              title="Inspect Wallet Intelligence"
                            >
                              {w.wallet.slice(0, 10)}...{w.wallet.slice(-8)}
                              <span className="material-symbols-outlined text-[13px] text-outline">open_in_new</span>
                            </span>
                            <span className="text-[10px] text-outline font-sans truncate max-w-[200px]">
                              {w.label || 'Target Wallet'} ({w.chain || 'ETH'})
                            </span>
                          </div>
                        </td>

                        {/* 3. CASE */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            onClick={() => navigate(`/graph/${w.case}`)}
                            className="text-on-surface-variant hover:text-primary cursor-pointer font-bold flex items-center gap-1"
                            title="Open Forensic Graph for Case"
                          >
                            <span className="material-symbols-outlined text-[14px] text-primary">folder</span>
                            {w.case}
                          </span>
                        </td>

                        {/* 4. LAST_CHECKED */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-on-surface-variant text-[11px]">
                          <div className="flex flex-col">
                            <span className="text-on-surface">{new Date(w.last_checked).toLocaleTimeString()}</span>
                            <span className="text-[10px] text-outline">
                              {new Date(w.last_checked).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* 5. LAST_TRANSACTION */}
                        <td className="px-5 py-3.5">
                          {w.last_transaction ? (
                            <div className="flex flex-col max-w-[280px]">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    isIncoming ? 'bg-primary/20 text-primary' : 'bg-amber-500/20 text-amber-400'
                                  }`}
                                >
                                  {w.last_transaction.direction}
                                </span>
                                <span className="text-[11px] font-bold text-on-surface">
                                  {w.last_transaction.amount} {w.last_transaction.asset}
                                </span>
                                {w.last_transaction.amount_usd && (
                                  <span className="text-[10px] text-outline">
                                    (~${w.last_transaction.amount_usd.toLocaleString()})
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-outline truncate font-mono mt-0.5">
                                {w.last_transaction.tx_hash.slice(0, 16)}...
                              </span>
                            </div>
                          ) : (
                            <span className="text-outline text-[11px] italic">No new transactions detected</span>
                          )}
                        </td>

                        {/* RISK SCORE */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              (w.risk_score || 50) >= 80
                                ? 'bg-error/20 text-error'
                                : (w.risk_score || 50) >= 50
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-primary/20 text-primary'
                            }`}
                          >
                            {w.risk_score || 50}/100
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/graph/${w.case}`)}
                              className="p-1 text-on-surface-variant hover:text-primary rounded hover:bg-surface-container"
                              title="Forensic Graph"
                            >
                              <span className="material-symbols-outlined text-[16px]">account_tree</span>
                            </button>
                            <button
                              onClick={() => handleToggleStatus(w.wallet, w.status)}
                              className="p-1 text-on-surface-variant hover:text-yellow-400 rounded hover:bg-surface-container"
                              title={w.status === 'ACTIVE' ? 'Pause Surveillance' : 'Resume Surveillance'}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {w.status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}
                              </span>
                            </button>
                            <button
                              onClick={() => handleRemoveWallet(w.wallet)}
                              className="p-1 text-on-surface-variant hover:text-error rounded hover:bg-surface-container"
                              title="Remove Target"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. REAL-TIME ALERT DISPATCH FEED (All 8 Typologies) */}
        {/* ==================================================================== */}
        <div className="surface-level-1 border border-outline-variant rounded-lg overflow-hidden shadow-sm">
          {/* Header & Filter Tabs */}
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
                  Live Alert Stream & Automated Rule Engine ({filteredAlerts.length} Dispatched Alerts)
                </h3>
                <p className="text-[11px] text-outline mt-0.5">
                  Real-time events dispatched upon transaction detection across all 8 monitored forensic typologies.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-outline">Severity:</span>
                <span className="px-2 py-0.5 rounded bg-error/20 text-error font-bold text-[10px]">
                  {alerts.filter((a) => a.severity === 'CRITICAL').length} CRITICAL
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">
                  {alerts.filter((a) => a.severity === 'HIGH').length} HIGH
                </span>
              </div>
            </div>

            {/* Typology Filter Chips */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-outline-variant/40">
              {alertTypologyOptions.map((opt) => {
                const count = opt.id === 'ALL' ? alerts.length : alerts.filter((a) => a.alert_type === opt.id).length;
                const isSelected = selectedAlertType === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedAlertType(opt.id)}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded flex items-center gap-1.5 transition-colors ${
                      isSelected
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{opt.icon}</span>
                    <span>{opt.label}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded ${
                        isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-outline'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alert Cards Feed */}
          <div className="divide-y divide-outline-variant/30 max-h-[600px] overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-outline text-xs font-mono">
                No alerts matching the selected filters. Active surveillance is listening on monitored target addresses.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL';
                const isHigh = alert.severity === 'HIGH';

                return (
                  <div
                    key={alert.id}
                    className={`p-4 hover:bg-surface-variant/30 transition-colors ${
                      !alert.is_acknowledged ? 'bg-primary/[0.015]' : 'opacity-80'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Alert Typology Badge */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-surface-container-highest text-primary border border-primary/20 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">radar</span>
                          {alert.alert_type}
                        </span>

                        {/* Severity Chip */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isCritical
                              ? 'bg-error/20 text-error border border-error/30'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-primary/20 text-primary'
                          }`}
                        >
                          {alert.severity}
                        </span>

                        {/* Case Badge */}
                        <span
                          onClick={() => navigate(`/graph/${alert.case}`)}
                          className="text-[11px] font-mono text-outline hover:text-primary cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">folder</span>
                          {alert.case}
                        </span>

                        {/* Timestamp */}
                        <span className="text-[10px] font-mono text-outline">
                          {new Date(alert.timestamp).toLocaleTimeString()} ({new Date(alert.timestamp).toLocaleDateString()})
                        </span>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-2">
                        {!alert.is_acknowledged ? (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="px-2.5 py-1 text-[10px] font-mono rounded bg-surface-container hover:bg-primary/20 hover:text-primary border border-outline-variant transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            Acknowledge
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-outline flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] text-primary">verified</span>
                            Acknowledged by {alert.acknowledged_by}
                          </span>
                        )}

                        <button
                          onClick={() => navigate(`/graph/${alert.case}`)}
                          className="btn-secondary px-2.5 py-1 text-[10px] font-mono rounded flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">account_tree</span>
                          Graph Hop
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-on-surface flex items-center gap-2">
                        {alert.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant font-sans leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    {/* Metadata Strip */}
                    <div className="mt-2.5 pt-2 border-t border-outline-variant/30 flex flex-wrap items-center gap-4 text-[11px] font-mono text-outline">
                      <div>
                        Target: <span className="text-on-surface font-bold">{alert.wallet.slice(0, 10)}...{alert.wallet.slice(-6)}</span>
                      </div>
                      <div>
                        Tx: <span className="text-primary hover:underline cursor-pointer">{alert.tx_hash.slice(0, 16)}...</span>
                      </div>
                      <div>
                        Chain: <span className="text-on-surface">{alert.chain}</span>
                      </div>
                      {alert.metadata.amount && (
                        <div>
                          Amount: <span className="text-on-surface font-bold">{alert.metadata.amount} {alert.metadata.asset || ''}</span>
                        </div>
                      )}
                      {alert.metadata.bridge_name && (
                        <div className="text-amber-400 font-bold">
                          Bridge: {alert.metadata.bridge_name}
                        </div>
                      )}
                      {alert.metadata.mixer_name && (
                        <div className="text-error font-bold">
                          Mixer: {alert.metadata.mixer_name}
                        </div>
                      )}
                      {alert.metadata.exchange_name && (
                        <div className="text-primary font-bold">
                          Exchange: {alert.metadata.exchange_name} (Subpoena Ready)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Monitored Wallet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-level-2 border border-outline-variant rounded-xl max-w-lg w-full p-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-4">
              <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_circle</span>
                Add Monitored Wallet to Surveillance Watchlist
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-outline hover:text-on-surface p-1"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddWalletSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-outline uppercase tracking-wider text-[10px] mb-1">
                  Target Wallet Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x... or bc1q... or base58 address"
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant text-on-surface rounded p-2 text-xs font-mono focus:border-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase tracking-wider text-[10px] mb-1">
                    Associated Case ID *
                  </label>
                  {activeCases.length > 0 ? (
                    <select
                      value={newCaseId}
                      onChange={(e) => {
                        setNewCaseId(e.target.value);
                        const matched = activeCases.find((c) => c.caseId === e.target.value);
                        if (matched && !newWalletAddress) {
                          setNewWalletAddress(matched.targetAddress);
                          setNewChain(matched.network);
                        }
                      }}
                      className="w-full bg-surface-container border border-outline-variant text-on-surface rounded p-2 text-xs font-mono focus:border-primary outline-none"
                    >
                      {activeCases.map((c) => (
                        <option key={c.caseId || c.id} value={c.caseId}>
                          {c.caseId} — {c.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. INV-2026-001"
                      value={newCaseId}
                      onChange={(e) => setNewCaseId(e.target.value)}
                      className="w-full bg-surface-container border border-outline-variant text-on-surface rounded p-2 text-xs font-mono focus:border-primary outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-outline uppercase tracking-wider text-[10px] mb-1">
                    Blockchain Network
                  </label>
                  <select
                    value={newChain}
                    onChange={(e) => setNewChain(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant text-on-surface rounded p-2 text-xs font-mono focus:border-primary outline-none"
                  >
                    <option value="Ethereum">Ethereum</option>
                    <option value="Bitcoin">Bitcoin</option>
                    <option value="Solana">Solana</option>
                    <option value="Tron">TRON</option>
                    <option value="Avalanche">Avalanche</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-outline uppercase tracking-wider text-[10px] mb-1">
                    Target Label / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Primary Drainer, Mule Hop"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant text-on-surface rounded p-2 text-xs font-sans focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-outline uppercase tracking-wider text-[10px] mb-1">
                    Alert Threshold (USD)
                  </label>
                  <input
                    type="number"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full bg-surface-container border border-outline-variant text-on-surface rounded p-2 text-xs font-mono focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-1.5 rounded text-outline hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-1.5 rounded font-semibold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Add Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
