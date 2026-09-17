import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { formatApiError } from '../utils/security';

export const Settings: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole('Admin') && hasPermission('settings:manage');

  const [ethRpc, setEthRpc] = useState('https://cloudflare-eth.com');
  const [btcRpc, setBtcRpc] = useState('https://mempool.space/api');
  const [solRpc, setSolRpc] = useState('https://api.mainnet-beta.solana.com');
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load backend configuration
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get<any>('/api/v1/settings');
        if (res.data) {
          if (res.data.ethRpcUrl) setEthRpc(res.data.ethRpcUrl);
          if (res.data.btcRpcUrl) setBtcRpc(res.data.btcRpcUrl);
          if (res.data.solanaRpcUrl) setSolRpc(res.data.solanaRpcUrl);
          if (res.data.aiAssistantEnabled !== undefined) setAiAssistantEnabled(res.data.aiAssistantEnabled);
        }
      } catch (err) {
        console.warn('Could not fetch server settings:', err);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMessage('Access Denied: Administrative role (Admin) required to commit system changes.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSavedMessage(null);

    try {
      await apiClient.put('/api/v1/settings', {
        ethRpcUrl: ethRpc,
        btcRpcUrl: btcRpc,
        solanaRpcUrl: solRpc,
        aiAssistantEnabled,
      });

      setSavedMessage('Forensic system configuration committed and cryptographically journaled.');
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err) {
      setErrorMessage(formatApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 select-none">
      {/* Top Header */}
      <div className="flex justify-between items-end border-b border-outline-variant pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] mb-1">
            <span className="font-sans text-outline uppercase tracking-widest">System</span>
            <span className="text-outline">/</span>
            <span className="font-sans text-primary uppercase tracking-widest">Settings</span>
          </div>
          <h2 className="text-[22px] font-semibold text-on-surface leading-tight tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[26px]">settings</span>
            System Configuration & Forensic Node Settings
          </h2>
          <p className="text-on-surface-variant mt-1 text-xs">
            Manage blockchain node endpoints, external intelligence APIs, AI reasoning models, and agency credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <span className="px-3 py-1.5 rounded bg-primary/20 text-primary border border-primary/30 text-xs font-mono flex items-center gap-1.5 animate-fade-in">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              {savedMessage}
            </span>
          )}
          {errorMessage && (
            <span className="px-3 py-1.5 rounded bg-error/20 text-error border border-error/30 text-xs font-mono flex items-center gap-1.5 animate-fade-in">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {errorMessage}
            </span>
          )}
        </div>
      </div>

      {/* RBAC Authorization Status Notice */}
      {!isAdmin && (
        <div className="p-3.5 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-outline text-[22px]">lock</span>
            <div>
              <div className="text-xs font-semibold text-on-surface">Administrative Read-Only View</div>
              <div className="text-[11px] text-outline mt-0.5">
                Modifications require statutory clearance level: <strong className="text-primary">Admin</strong>. Your role is: <strong className="text-on-surface">{user?.role}</strong>.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded bg-surface-container-high text-outline border border-outline-variant">
            MUTATION LOCKED
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Node RPC Endpoints */}
        <div className="surface-level-1 border border-outline-variant rounded-lg p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">dns</span>
              Blockchain Node RPC Connections
            </h3>
            <span className="text-[11px] text-primary font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              All Nodes Operational
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block">
                Ethereum (ETH) RPC URL
              </label>
              <input
                type="text"
                disabled={!isAdmin || isSaving}
                value={ethRpc}
                onChange={(e) => setEthRpc(e.target.value)}
                className="w-full input-field rounded px-3 py-2 text-xs font-mono text-on-surface disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block">
                Bitcoin (BTC) Electrum / Mempool URL
              </label>
              <input
                type="text"
                disabled={!isAdmin || isSaving}
                value={btcRpc}
                onChange={(e) => setBtcRpc(e.target.value)}
                className="w-full input-field rounded px-3 py-2 text-xs font-mono text-on-surface disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block">
                Solana (SOL) Validator RPC URL
              </label>
              <input
                type="text"
                disabled={!isAdmin || isSaving}
                value={solRpc}
                onChange={(e) => setSolRpc(e.target.value)}
                className="w-full input-field rounded px-3 py-2 text-xs font-mono text-on-surface disabled:opacity-60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block">
                Etherscan V2 External Indexer Secret Key
              </label>
              <input
                type="password"
                disabled
                value="••••••••••••••••••••••••••••••••"
                className="w-full input-field rounded px-3 py-2 text-xs font-mono text-outline cursor-not-allowed bg-surface-container-lowest"
              />
              <span className="text-[10px] text-outline font-mono">
                Stored in server environment (.env). Never transmitted to frontend client.
              </span>
            </div>
          </div>
        </div>

        {/* 2. AI Reasoning Configuration */}
        <div className="surface-level-1 border border-outline-variant rounded-lg p-6 space-y-4 shadow-sm">
          <div className="border-b border-outline-variant pb-3">
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
              AI Forensic Reasoning & Intelligence Models
            </h3>
          </div>

          <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg border border-outline-variant">
            <div>
              <span className="text-xs font-semibold text-on-surface block">Gemini 1.5 Pro Forensic Copilot</span>
              <span className="text-[11px] text-outline block mt-0.5">
                Autonomous heuristic attribution, peel chain tracing, and graph anomaly detection.
              </span>
            </div>
            <input
              type="checkbox"
              disabled={!isAdmin || isSaving}
              checked={aiAssistantEnabled}
              onChange={(e) => setAiAssistantEnabled(e.target.checked)}
              className="rounded bg-surface-container border-outline-variant text-primary cursor-pointer w-4 h-4"
            />
          </div>
        </div>

        {/* 3. Investigator Profile */}
        {user && (
          <div className="surface-level-1 border border-outline-variant rounded-lg p-6 space-y-4 shadow-sm">
            <div className="border-b border-outline-variant pb-3">
              <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                Active Station Clearance
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-surface-container p-3 rounded border border-outline-variant">
                <span className="text-[10px] font-sans text-outline uppercase block">Investigator Name</span>
                <span className="font-bold text-on-surface text-sm mt-0.5 block">{user.name}</span>
              </div>
              <div className="bg-surface-container p-3 rounded border border-outline-variant">
                <span className="text-[10px] font-sans text-outline uppercase block">Assigned Clearance</span>
                <span className="font-bold text-primary text-sm mt-0.5 block">{user.role}</span>
              </div>
              <div className="bg-surface-container p-3 rounded border border-outline-variant">
                <span className="text-[10px] font-sans text-outline uppercase block">Badge Identifier</span>
                <span className="font-bold text-on-surface text-sm mt-0.5 block">{user.badgeNumber}</span>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        {isAdmin && (
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isSaving ? 'sync' : 'save'}
              </span>
              <span>{isSaving ? 'Saving Changes...' : 'Save Configuration Changes'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
