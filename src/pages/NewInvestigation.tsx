import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api';
import { validateBlockchainAddress, validateCaseId, formatApiError } from '../utils/security';
import { SupabaseService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import { NcrpSahyogService } from '../services/ncrpSahyogService';
import { NcrpComplaint } from '../types/ncrpSahyog';

export const NewInvestigation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL query pre-fills
  const initialNcrpAck = searchParams.get('ncrpAck') || '';
  const initialAddr = searchParams.get('addr') || '';
  const initialNet = searchParams.get('net') || 'ETH';
  const initialLoss = searchParams.get('loss') || '';
  const initialVictim = searchParams.get('victim') || '';
  const initialCategory = searchParams.get('category') || '';

  const [caseId, setCaseId] = useState(() =>
    initialNcrpAck
      ? `INV-NCRP-${initialNcrpAck.slice(-6)}`
      : `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [priority, setPriority] = useState('high');
  const [fraudType, setFraudType] = useState(() => {
    if (initialCategory.toLowerCase().includes('task') || initialCategory.toLowerCase().includes('butcher')) return 'pig_butchering';
    if (initialCategory.toLowerCase().includes('ransom')) return 'ransomware';
    if (initialCategory.toLowerCase().includes('phish')) return 'phishing';
    if (initialCategory.toLowerCase().includes('hack')) return 'hacks';
    return 'pig_butchering';
  });
  const [amount, setAmount] = useState(initialLoss);
  const [targetAddress, setTargetAddress] = useState(initialAddr);
  const [network, setNetwork] = useState(initialNet);
  const [victimRef, setVictimRef] = useState(initialVictim);
  const [linkedNcrpAck, setLinkedNcrpAck] = useState(initialNcrpAck);
  const [notes, setNotes] = useState(() => (initialNcrpAck ? `Imported from NCRP Ticket #${initialNcrpAck}` : ''));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // NCRP Picker Modal
  const [showNcrpPicker, setShowNcrpPicker] = useState(false);
  const [ncrpList, setNcrpList] = useState<NcrpComplaint[]>([]);
  const [isLoadingNcrp, setIsLoadingNcrp] = useState(false);

  useEffect(() => {
    if (showNcrpPicker) {
      setIsLoadingNcrp(true);
      NcrpSahyogService.getComplaints()
        .then((res) => setNcrpList(res.complaints))
        .catch((e) => console.warn('Could not load NCRP complaints:', e))
        .finally(() => setIsLoadingNcrp(false));
    }
  }, [showNcrpPicker]);

  const selectNcrpComplaint = (c: NcrpComplaint) => {
    setLinkedNcrpAck(c.acknowledgmentNo);
    setCaseId(`INV-NCRP-${c.acknowledgmentNo.slice(-6)}`);
    setAmount(String(c.fraudAmountUsd || ''));
    setVictimRef(c.complainantName);
    setNotes(`Imported from NCRP Ticket #${c.acknowledgmentNo} (${c.policeStation}, ${c.state}). Reported fraud: ₹${c.fraudAmountInr.toLocaleString()}.`);
    if (c.suspectWallets && c.suspectWallets.length > 0) {
      setTargetAddress(c.suspectWallets[0].address);
      setNetwork(c.suspectWallets[0].blockchain === 'Bitcoin' ? 'BTC' : c.suspectWallets[0].blockchain === 'Solana' ? 'SOL' : 'ETH');
    }
    setShowNcrpPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client-side address & case ID validation
    const caseCheck = validateCaseId(caseId);
    if (!caseCheck.isValid) {
      setValidationError(caseCheck.message || 'Invalid Case ID format.');
      return;
    }

    const addrCheck = validateBlockchainAddress(targetAddress, network);
    if (!addrCheck.isValid) {
      setValidationError(addrCheck.message || 'Invalid target address format.');
      return;
    }

    const numAmount = amount.trim() ? parseFloat(amount) : 0;
    if (isNaN(numAmount) || numAmount < 0) {
      setValidationError('Reported loss amount must be a valid non-negative number.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Persist to Supabase database (handles direct Supabase insert or backend gateway with service-role privileges)
      await SupabaseService.createCase({
        case_id: caseId.trim(),
        title: `${fraudType.replace(/_/g, ' ').toUpperCase()} Syndicate Exfiltration`,
        priority,
        fraud_type: fraudType,
        reported_amount_usd: numAmount,
        target_address: targetAddress.trim(),
        network: network.toUpperCase(),
        victim_ref: victimRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      navigate(`/graph/${caseId.trim()}`);
    } catch (err: any) {
      setValidationError(formatApiError(err) || err?.message || 'Failed to initialize case in database.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-end border-b border-outline-variant pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] mb-1">
            <span className="font-sans text-outline uppercase tracking-widest">Investigations</span>
            <span className="text-outline">/</span>
            <span className="font-sans text-primary uppercase tracking-widest">Create Case</span>
            {linkedNcrpAck && (
              <span className="bg-primary/20 text-primary border border-primary/40 text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                LINKED NCRP #{linkedNcrpAck}
              </span>
            )}
          </div>
          <h2 className="text-[22px] font-semibold text-on-surface leading-tight tracking-tight">
            New Investigation
          </h2>
          <p className="text-on-surface-variant mt-1 text-xs">
            Initialize a new case to trace blockchain transactions, extract fund flows, and attribute threat actors.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowNcrpPicker(true)}
            className="btn-secondary px-3 py-1.5 text-xs rounded flex items-center gap-1.5 font-medium shadow-sm hover:border-primary/50"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">download</span>
            <span>Import from NCRP / 1930</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Form Area (8-col) */}
        <div className="col-span-12 lg:col-span-8">
          <form onSubmit={handleSubmit} className="surface-level-1 border border-outline-variant rounded-lg p-6 space-y-5 shadow-sm">
            {/* Validation Error Banner */}
            {validationError && (
              <div className="p-3 rounded-lg bg-error-container/20 border border-error/40 text-error text-xs flex items-center gap-2.5 animate-fade-in font-sans">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* Row 1: Case ID & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block" htmlFor="case_id">
                  Case ID
                </label>
                <input
                  id="case_id"
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full input-field rounded px-3 py-2 text-xs font-mono text-on-surface"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block" htmlFor="priority">
                  Investigation Priority
                </label>
                <select
                  id="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full input-field rounded px-3 py-2 text-xs font-sans text-on-surface appearance-none cursor-pointer"
                >
                  <option value="critical">Critical - Asset Flight in Progress</option>
                  <option value="high">High - Immediate Action</option>
                  <option value="medium">Medium - Standard SLA</option>
                  <option value="low">Low - Backlog</option>
                </select>
              </div>
            </div>

            {/* Row 2: Fraud Type & Reported Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block" htmlFor="fraud_type">
                  Fraud Typology
                </label>
                <select
                  id="fraud_type"
                  value={fraudType}
                  onChange={(e) => setFraudType(e.target.value)}
                  className="w-full input-field rounded px-3 py-2 text-xs font-sans text-on-surface appearance-none cursor-pointer"
                >
                  <option value="pig_butchering">Pig Butchering (Sha Zhu Pan)</option>
                  <option value="phishing">Phishing / Ice Phishing / Drainer</option>
                  <option value="ransomware">Ransomware Extortion</option>
                  <option value="hacks">Exchange / DeFi Protocol Exploit</option>
                  <option value="sanctions_evasion">Sanctions Evasion</option>
                  <option value="other">Other Cyber Fraud</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block" htmlFor="amount">
                  Reported Amount (USD Equivalent)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono text-xs">$</span>
                  <input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full input-field rounded pl-7 pr-3 py-2 text-xs font-mono text-on-surface"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-outline-variant/40 pt-2"></div>

            {/* Row 3: Target Address & Network */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider flex items-center justify-between" htmlFor="target_address">
                  <span>Target Wallet Address</span>
                  <span className="text-[9px] bg-primary-container/20 text-primary px-1.5 py-0.2 rounded border border-primary/30">Required</span>
                </label>
                <div className="relative">
                  <input
                    id="target_address"
                    type="text"
                    required
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    placeholder="0x... or bc1..."
                    className="w-full input-field rounded px-3 py-2 pr-9 text-xs font-mono text-on-surface"
                  />
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    account_balance_wallet
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block" htmlFor="network">
                  Network
                </label>
                <select
                  id="network"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                  className="w-full input-field rounded px-3 py-2 text-xs font-sans text-on-surface appearance-none cursor-pointer"
                >
                  <option value="eth">Ethereum (ETH)</option>
                  <option value="btc">Bitcoin (BTC)</option>
                  <option value="sol">Solana (SOL)</option>
                  <option value="bsc">BNB Chain (BSC)</option>
                  <option value="tron">TRON (USDT-TRC20)</option>
                </select>
              </div>
            </div>

            {/* Row 4: Victim Ref & Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block" htmlFor="victim_ref">
                Victim Reference / Incident Report ID
              </label>
              <input
                id="victim_ref"
                type="text"
                value={victimRef}
                onChange={(e) => setVictimRef(e.target.value)}
                placeholder="Police Complaint #, FIR #, Internal Agency ID"
                className="w-full input-field rounded px-3 py-2 text-xs text-on-surface"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-sans text-on-surface-variant uppercase tracking-wider block" htmlFor="notes">
                Case Intelligence Notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Initial context, modus operandi, communication channels, suspect aliases..."
                className="w-full input-field rounded px-3 py-2 text-xs text-on-surface resize-y"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-outline-variant/40">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary px-4 py-2 text-xs rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="btn-primary px-6 py-2 rounded-md text-xs font-semibold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isAnalyzing ? 'sync' : 'troubleshoot'}
                </span>
                {isAnalyzing ? 'Initializing Blockchain Crawl...' : 'Start Blockchain Analysis'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Panel (4-col) */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="surface-level-1 border border-outline-variant rounded-lg p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5 pb-3 border-b border-outline-variant">
              <span className="material-symbols-outlined text-primary text-[20px]">
                troubleshoot
              </span>
              <h3 className="text-sm font-semibold text-on-surface">Analysis Pipeline</h3>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Upon case initiation, the automated forensics engine executes a 3-stage heuristic pipeline:
            </p>

            <div className="space-y-3.5 pt-1">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5 border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px]">account_tree</span>
                </div>
                <div>
                  <strong className="text-xs text-on-surface block font-medium">5-Hop Fund Flow Crawl</strong>
                  <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">
                    Recursively maps incoming & outgoing transfers to untangle layering and mixer hops.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5 border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px]">database</span>
                </div>
                <div>
                  <strong className="text-xs text-on-surface block font-medium">VASP Attribution Matching</strong>
                  <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">
                    Cross-references cluster deposit heuristics with OFAC, exchange clusters, and bridges.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded bg-surface-container flex items-center justify-center text-error shrink-0 mt-0.5 border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px]">speed</span>
                </div>
                <div>
                  <strong className="text-xs text-on-surface block font-medium">Risk & Exposure Scoring</strong>
                  <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5">
                    Assigns 0–100 composite illicit exposure score based on proximity to mixers and blacklists.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* System Status Card */}
          <div className="surface-level-1 border border-outline-variant rounded-lg p-4 flex items-center justify-between border-l-4 border-l-primary shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
              <div>
                <span className="text-[10px] font-sans text-outline tracking-wider uppercase block">Forensic Node Status</span>
                <span className="text-xs font-semibold text-on-surface">Mainnet Pipeline Active</span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-container/20 px-2 py-0.5 rounded border border-primary/30 font-mono">
              READY
            </span>
          </div>
        </div>
      </div>

      {/* NCRP Complaint Picker Modal */}
      {showNcrpPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="surface-level-1 border border-outline-variant rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div>
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">report</span>
                  Select NCRP / 1930 Complaint to Import
                </h3>
                <p className="text-[11px] text-outline mt-0.5">
                  Auto-fills case identifier, suspect addresses, victim details, and reported loss amounts.
                </p>
              </div>
              <button
                onClick={() => setShowNcrpPicker(false)}
                className="p-1 rounded text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {isLoadingNcrp ? (
              <div className="py-8 text-center text-outline font-mono text-xs">
                <span className="material-symbols-outlined text-[20px] animate-spin text-primary block mb-1">sync</span>
                Fetching NCRP complaints...
              </div>
            ) : ncrpList.length === 0 ? (
              <div className="py-8 text-center text-outline text-xs">No complaints available.</div>
            ) : (
              <div className="space-y-2">
                {ncrpList.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectNcrpComplaint(c)}
                    className="p-3 rounded-lg bg-surface-container border border-outline-variant hover:border-primary cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary text-xs">#{c.acknowledgmentNo}</span>
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.2 rounded font-mono">
                          {c.state}
                        </span>
                        <span className="text-xs font-semibold text-on-surface">{c.complainantName}</span>
                      </div>
                      <div className="text-[11px] text-outline mt-1 font-sans">
                        {c.crimeCategory} • {c.policeStation}
                      </div>
                      {c.suspectWallets.length > 0 && (
                        <div className="text-[10px] font-mono text-outline mt-0.5">
                          Target: {c.suspectWallets[0].address.substring(0, 10)}... ({c.suspectWallets[0].blockchain})
                        </div>
                      )}
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-xs font-bold text-on-surface">₹{c.fraudAmountInr.toLocaleString()}</div>
                      <div className="text-[10px] text-primary">${c.fraudAmountUsd.toLocaleString()} USD</div>
                      <span className="btn-primary py-0.5 px-2 text-[10px] rounded font-semibold inline-block mt-1">
                        Select
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
