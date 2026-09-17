import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NcrpSahyogService, CrossCheckResult } from '../services/ncrpSahyogService';
import {
  NcrpComplaint,
  ActionTakenReport,
  SahyogNotice,
  VaspNodalContact,
  SahyogWorkspace,
  IntelligenceBulletin,
  StatutoryNoticeType,
} from '../types/ncrpSahyog';
import { SupabaseService } from '../services/supabaseService';
import { Case } from '../types';

export const NcrpSahyogHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasPermission } = useAuth();

  // Active Tab
  const initialTab = (searchParams.get('tab') as 'ncrp' | 'sahyog' | 'workspaces' | 'directory') || 'ncrp';
  const [activeTab, setActiveTab] = useState<'ncrp' | 'sahyog' | 'workspaces' | 'directory'>(initialTab);

  // Cases loaded from DB for quick linking
  const [activeCases, setActiveCases] = useState<Case[]>([]);

  // State: NCRP Complaints
  const [complaints, setComplaints] = useState<NcrpComplaint[]>([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState<boolean>(true);
  const [selectedComplaint, setSelectedComplaint] = useState<NcrpComplaint | null>(null);
  const [ncrpSearch, setNcrpSearch] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // State: SAHYOG Notices
  const [notices, setNotices] = useState<SahyogNotice[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState<boolean>(true);
  const [selectedNotice, setSelectedNotice] = useState<SahyogNotice | null>(null);
  const [noticeFilterType, setNoticeFilterType] = useState<string>('ALL');
  const [noticeFilterStatus, setNoticeFilterStatus] = useState<string>('ALL');

  // State: Workspaces & Bulletins
  const [workspaces, setWorkspaces] = useState<SahyogWorkspace[]>([]);
  const [bulletins, setBulletins] = useState<IntelligenceBulletin[]>([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(true);

  // State: VASP Directory
  const [vaspDirectory, setVaspDirectory] = useState<VaspNodalContact[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState<boolean>(true);

  // Modals
  const [showNewComplaintModal, setShowNewComplaintModal] = useState<boolean>(false);
  const [showDispatchNoticeModal, setShowDispatchNoticeModal] = useState<boolean>(false);
  const [showAtrModal, setShowAtrModal] = useState<boolean>(false);
  const [showComplianceUpdateModal, setShowComplianceUpdateModal] = useState<boolean>(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState<boolean>(false);
  const [atrTargetComplaint, setAtrTargetComplaint] = useState<NcrpComplaint | null>(null);

  // Quick Action Feedback
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Notification helper
  const notify = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Sync tab with URL
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  // Load cases
  useEffect(() => {
    SupabaseService.getCases()
      .then((c) => setActiveCases(c || []))
      .catch((e) => console.warn('Could not load cases:', e));
  }, []);

  // Load NCRP Complaints
  const refreshComplaints = async () => {
    setIsLoadingComplaints(true);
    try {
      const res = await NcrpSahyogService.getComplaints({
        search: ncrpSearch.trim() || undefined,
        state: selectedState !== 'ALL' ? selectedState : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        crimeCategory: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });
      setComplaints(res.complaints);
    } catch (err: any) {
      console.warn('Failed to load complaints:', err);
    } finally {
      setIsLoadingComplaints(false);
    }
  };

  useEffect(() => {
    refreshComplaints();
  }, [selectedState, selectedStatus, selectedCategory]);

  // Load SAHYOG Notices
  const refreshNotices = async () => {
    setIsLoadingNotices(true);
    try {
      const res = await NcrpSahyogService.getNotices({
        noticeType: noticeFilterType !== 'ALL' ? noticeFilterType : undefined,
        status: noticeFilterStatus !== 'ALL' ? noticeFilterStatus : undefined,
      });
      setNotices(res.notices);
    } catch (err: any) {
      console.warn('Failed to load notices:', err);
    } finally {
      setIsLoadingNotices(false);
    }
  };

  useEffect(() => {
    refreshNotices();
  }, [noticeFilterType, noticeFilterStatus]);

  // Load Workspaces & VASP Directory
  useEffect(() => {
    NcrpSahyogService.getWorkspaces()
      .then((data) => {
        setWorkspaces(data.workspaces);
        setBulletins(data.bulletins);
        setIsLoadingWorkspaces(false);
      })
      .catch(() => setIsLoadingWorkspaces(false));

    NcrpSahyogService.getVaspDirectory()
      .then((dir) => {
        setVaspDirectory(dir);
        setIsLoadingDirectory(false);
      })
      .catch(() => setIsLoadingDirectory(false));
  }, []);

  // 1930 Rapid Freeze Action
  const handleRapidFreeze = async (complaintId: string) => {
    try {
      const updated = await NcrpSahyogService.issueRapidFreeze(complaintId);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedComplaint?.id === updated.id) setSelectedComplaint(updated);
      notify('success', `1930 CFCFRMS emergency freeze dispatched! Alert ID: ${updated.cfcfrmsAlertId}`);
    } catch (err: any) {
      notify('error', err.message || 'Failed to dispatch freeze alert.');
    }
  };

  // Convert NCRP Complaint to active Investigation Case
  const handleImportToCase = (comp: NcrpComplaint) => {
    const primaryWallet = comp.suspectWallets[0]?.address || '';
    const network = comp.suspectWallets[0]?.blockchain === 'Bitcoin' ? 'BTC' : 'ETH';
    navigate(
      `/investigations/new?ncrpAck=${encodeURIComponent(comp.acknowledgmentNo)}&addr=${encodeURIComponent(
        primaryWallet
      )}&net=${network}&loss=${comp.fraudAmountUsd}&victim=${encodeURIComponent(comp.complainantName)}&category=${encodeURIComponent(
        comp.crimeCategory
      )}`
    );
  };

  // Statistics
  const totalReportedInr = useMemo(() => complaints.reduce((sum, c) => sum + (c.fraudAmountInr || 0), 0), [complaints]);
  const totalFrozenInr = useMemo(
    () =>
      notices
        .filter((n) => n.status === 'ASSETS_FROZEN')
        .reduce((sum, n) => sum + (n.responseSummary?.frozenAmountInr || 0), 0),
    [notices]
  );
  const activeNoticesCount = useMemo(
    () => notices.filter((n) => n.status === 'DISPATCHED' || n.status === 'COMPLIANCE_IN_PROGRESS').length,
    [notices]
  );
  const repeatOffendersCount = useMemo(() => complaints.filter((c) => (c.crossIncidentMatches || 0) > 1).length, [complaints]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Toast Alert Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between shadow-lg animate-fade-in transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-red-950/80 border-red-500/50 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[18px]">
              {actionNotice.type === 'success' ? 'verified' : 'error'}
            </span>
            <span className="font-medium">{actionNotice.message}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-current opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-outline-variant pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] mb-1">
            <span className="font-sans text-outline uppercase tracking-widest">National Cyber Forensics</span>
            <span className="text-outline">/</span>
            <span className="font-sans text-primary uppercase tracking-widest">Indian Law Enforcement Gateway</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-primary-container flex items-center justify-center text-on-primary-container shadow-sm">
              <span className="material-symbols-outlined text-[22px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
            </div>
            <div>
              <h2 className="text-[22px] font-semibold text-on-surface leading-tight tracking-tight flex items-center gap-2">
                NCRP & SAHYOG Integration Hub
                <span className="bg-primary/20 text-primary border border-primary/40 text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                  I4C • MHA Validated
                </span>
              </h2>
              <p className="text-on-surface-variant mt-0.5 text-xs">
                Unified gateway for National Cybercrime Reporting Portal (1930 / CFCFRMS) complaints and statutory VASP coordination under BNSS 2023.
              </p>
            </div>
          </div>
        </div>

        {/* Global Hub Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowNewComplaintModal(true)}
            className="btn-secondary px-3.5 py-1.5 text-xs rounded flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add_task</span>
            Intake NCRP Ticket
          </button>
          <button
            onClick={() => setShowDispatchNoticeModal(true)}
            className="btn-primary px-3.5 py-1.5 text-xs rounded font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            Dispatch BNSS Notice
          </button>
        </div>
      </div>

      {/* Top Hero KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 - Total Reported Losses */}
        <div className="surface-level-1 rounded-md p-4 border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest font-semibold">
              Total Defrauded Reported (NCRP)
            </span>
            <span className="material-symbols-outlined text-primary text-[18px]">currency_rupee</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface font-mono tracking-tight">
              ₹{(totalReportedInr / 10000000).toFixed(2)} <span className="text-xs font-normal text-outline">Cr</span>
            </div>
            <div className="text-[11px] font-mono text-outline mt-1 flex items-center gap-1">
              <span>≈ ${(totalReportedInr / 83.33).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</span>
              <span className="text-primary font-bold ml-1">({complaints.length} tickets)</span>
            </div>
          </div>
        </div>

        {/* KPI 2 - Active Statutory Notices */}
        <div className="surface-level-1 rounded-md p-4 border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest font-semibold">
              Active SAHYOG Notices
            </span>
            <span className="material-symbols-outlined text-tertiary text-[18px]">pending_actions</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-on-surface font-mono tracking-tight">
              {activeNoticesCount}{' '}
              <span className="text-xs font-normal text-outline">/ {notices.length} total</span>
            </div>
            <div className="text-[11px] font-mono text-tertiary mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">timer</span>
              <span>Sec 94 & 107 BNSS under active SLA</span>
            </div>
          </div>
        </div>

        {/* KPI 3 - Total Assets Frozen / Lien-Marked */}
        <div className="surface-level-1 rounded-md p-4 border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest font-semibold">
              Crypto Assets Secured / Frozen
            </span>
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">lock_reset</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
              ₹{(totalFrozenInr / 100000).toFixed(1)} <span className="text-xs font-normal text-outline">Lakhs</span>
            </div>
            <div className="text-[11px] font-mono text-emerald-400/80 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              <span>Escrow & hard freeze confirmed</span>
            </div>
          </div>
        </div>

        {/* KPI 4 - Cross-Jurisdiction Repeat Wallets */}
        <div className="surface-level-1 rounded-md p-4 border border-outline-variant shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-sans text-on-surface-variant uppercase tracking-widest font-semibold">
              Cross-State Correlated Targets
            </span>
            <span className="material-symbols-outlined text-severity-critical text-[18px]">hub</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-severity-critical font-mono tracking-tight">
              {repeatOffendersCount}{' '}
              <span className="text-xs font-normal text-outline">Syndicate Wallets</span>
            </div>
            <div className="text-[11px] font-mono text-severity-critical/90 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">warning</span>
              <span>Multi-state complaints correlation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-outline-variant/80">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('ncrp')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'ncrp'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">report</span>
            NCRP Incident Portal ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab('sahyog')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'sahyog'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            SAHYOG Statutory Notices ({notices.length})
          </button>
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'workspaces'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">groups</span>
            Inter-Agency Workspaces ({workspaces.length})
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">contact_phone</span>
            VASP Nodal Directory ({vaspDirectory.length})
          </button>
        </div>

        {/* Sub-label */}
        <div className="text-[11px] font-mono text-outline pb-2 hidden md:block">
          {activeTab === 'ncrp' && 'National Cybercrime Reporting Portal • 1930 Hotline'}
          {activeTab === 'sahyog' && 'Sec 94 & 107 BNSS (2023) Legal Notice Engine'}
          {activeTab === 'workspaces' && 'CBI / State Cyber Cells / ED / FIU Joint Desk'}
          {activeTab === 'directory' && 'FIU-IND Registered VASP Compliance Directory'}
        </div>
      </div>

      {/* ============================================================
          TAB 1: NCRP INCIDENT PORTAL
          ============================================================ */}
      {activeTab === 'ncrp' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="surface-level-1 p-3 rounded-lg border border-outline-variant flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <span className="material-symbols-outlined text-outline absolute left-3 top-2.5 text-[16px]">search</span>
              <input
                type="text"
                value={ncrpSearch}
                onChange={(e) => setNcrpSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && refreshComplaints()}
                placeholder="Search Ack No, victim name, police station, or suspect address..."
                className="w-full bg-surface-container border border-outline-variant rounded pl-9 pr-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary font-sans"
              />
            </div>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-sans"
            >
              <option value="ALL">All States / UTs</option>
              <option value="Delhi">Delhi</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Telangana">Telangana</option>
              <option value="Gujarat">Gujarat</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-sans"
            >
              <option value="ALL">All Statuses</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="UNDER_TRIAGE">UNDER TRIAGE</option>
              <option value="ON_CHAIN_TRACED">ON-CHAIN TRACED</option>
              <option value="FREEZE_INITIATED">FREEZE INITIATED</option>
              <option value="LIEN_MARKED">LIEN MARKED</option>
              <option value="ATR_SUBMITTED">ATR SUBMITTED</option>
            </select>

            {/* Crime Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-sans"
            >
              <option value="ALL">All Crime Categories</option>
              <option value="Cryptocurrency Investment Scam">Crypto Investment Scam</option>
              <option value="Task-Based Fraud / Pig Butchering">Task Fraud / Pig Butchering</option>
              <option value="P2P Escrow Fraud">P2P Escrow Fraud</option>
              <option value="Fake Exchange / Cloud Mining dApp">Fake Exchange / dApp</option>
              <option value="Ransomware / Extortion">Ransomware</option>
            </select>

            <button
              onClick={() => refreshComplaints()}
              className="btn-secondary px-3 py-1.5 text-xs rounded font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Filter
            </button>
          </div>

          {/* Complaints Table */}
          <div className="surface-level-1 border border-outline-variant rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-surface-container border-b border-outline-variant text-[10px] text-outline uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">NCRP Ack No.</th>
                    <th className="py-3 px-4">State & Police Station</th>
                    <th className="py-3 px-4">Complainant</th>
                    <th className="py-3 px-4">Crime Category</th>
                    <th className="py-3 px-4">Reported Loss</th>
                    <th className="py-3 px-4">Suspect Wallets</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {isLoadingComplaints ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-outline font-mono">
                        <span className="material-symbols-outlined text-[24px] animate-spin text-primary block mb-2">sync</span>
                        Querying NCRP database...
                      </td>
                    </tr>
                  ) : complaints.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-outline">
                        No NCRP complaints found matching current query.
                      </td>
                    </tr>
                  ) : (
                    complaints.map((comp) => {
                      const isCorrelated = (comp.crossIncidentMatches || 0) > 1;
                      return (
                        <tr key={comp.id} className="hover:bg-surface-container/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{comp.acknowledgmentNo}</span>
                              {comp.linkedCaseId && (
                                <span className="text-[9px] bg-primary-container text-white px-1.5 py-0.2 rounded font-mono">
                                  {comp.linkedCaseId}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-outline font-sans mt-0.5">
                              {new Date(comp.reportedDate).toLocaleDateString()}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold text-on-surface flex items-center gap-1">
                              <span>{comp.state}</span>
                              {isCorrelated && (
                                <span
                                  title={`Flagged in ${comp.crossIncidentMatches} complaints nationwide`}
                                  className="material-symbols-outlined text-severity-critical text-[14px]"
                                >
                                  warning
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-outline truncate max-w-[200px]" title={comp.policeStation}>
                              {comp.policeStation}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-on-surface font-medium">{comp.complainantName}</div>
                            <div className="text-[10px] font-mono text-outline">{comp.complainantContact}</div>
                          </td>

                          <td className="py-3 px-4 text-on-surface-variant">
                            <span className="inline-block bg-surface-container px-2 py-0.5 rounded text-[11px] border border-outline-variant/50">
                              {comp.crimeCategory}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono whitespace-nowrap">
                            <div className="text-on-surface font-semibold">
                              ₹{comp.fraudAmountInr.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-primary">
                              ${comp.fraudAmountUsd.toLocaleString()} USD
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono">
                            {comp.suspectWallets.length > 0 ? (
                              <div className="space-y-1">
                                {comp.suspectWallets.slice(0, 2).map((w, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                    <span className="px-1 py-0.2 bg-secondary-container text-on-secondary-container text-[9px] rounded font-bold">
                                      {w.blockchain}
                                    </span>
                                    <span className="text-on-surface truncate max-w-[120px]" title={w.address}>
                                      {w.address.substring(0, 6)}...{w.address.substring(w.address.length - 4)}
                                    </span>
                                  </div>
                                ))}
                                {comp.suspectWallets.length > 2 && (
                                  <span className="text-[10px] text-outline">+{comp.suspectWallets.length - 2} more</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-outline text-[11px]">No unhosted wallets</span>
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                                comp.status === 'ATR_SUBMITTED'
                                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                                  : comp.status === 'FREEZE_INITIATED' || comp.status === 'LIEN_MARKED'
                                  ? 'bg-primary/20 border-primary/50 text-primary'
                                  : comp.status === 'ON_CHAIN_TRACED'
                                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-400'
                                  : 'bg-surface-container border-outline-variant text-outline'
                              }`}
                            >
                              {comp.status.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => setSelectedComplaint(comp)}
                                title="View Complaint Dossier"
                                className="p-1 rounded text-outline hover:text-primary hover:bg-surface-container transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                              </button>

                              {/* 1930 Rapid Freeze */}
                              <button
                                onClick={() => handleRapidFreeze(comp.id)}
                                title="Trigger 1930 / CFCFRMS Rapid Freeze"
                                className="p-1 rounded text-outline hover:text-amber-400 hover:bg-amber-950/40 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">lock</span>
                              </button>

                              {/* Generate ATR */}
                              <button
                                onClick={() => {
                                  setAtrTargetComplaint(comp);
                                  setShowAtrModal(true);
                                }}
                                title="Generate Section 63 BSA Action Taken Report (ATR)"
                                className="p-1 rounded text-outline hover:text-emerald-400 hover:bg-emerald-950/40 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">description</span>
                              </button>

                              {/* One-click import to Case */}
                              <button
                                onClick={() => handleImportToCase(comp)}
                                className="btn-primary py-1 px-2 text-[11px] rounded font-semibold flex items-center gap-1"
                              >
                                <span>Trace</span>
                                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: SAHYOG STATUTORY NOTICES (SEC 94 & 107 BNSS)
          ============================================================ */}
      {activeTab === 'sahyog' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="surface-level-1 p-3 rounded-lg border border-outline-variant flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select
                value={noticeFilterType}
                onChange={(e) => setNoticeFilterType(e.target.value)}
                className="bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-sans"
              >
                <option value="ALL">All Notice Types</option>
                <option value="SECTION_94_BNSS">Section 94 BNSS (KYC / IP Summons)</option>
                <option value="SECTION_107_BNSS">Section 107 BNSS (Asset Seizure & Freeze)</option>
                <option value="SECTION_111_BNSS">Section 111 BNSS (Organized Crime)</option>
              </select>

              <select
                value={noticeFilterStatus}
                onChange={(e) => setNoticeFilterStatus(e.target.value)}
                className="bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-sans"
              >
                <option value="ALL">All Compliance States</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="COMPLIANCE_IN_PROGRESS">IN PROGRESS</option>
                <option value="KYC_RECEIVED">KYC RECEIVED</option>
                <option value="ASSETS_FROZEN">ASSETS FROZEN</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>

            <button
              onClick={() => setShowDispatchNoticeModal(true)}
              className="btn-primary px-3.5 py-1.5 text-xs rounded font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              New Statutory Notice
            </button>
          </div>

          {/* Notices Grid / Table */}
          <div className="surface-level-1 border border-outline-variant rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-surface-container border-b border-outline-variant text-[10px] text-outline uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Notice Reference</th>
                  <th className="py-3 px-4">Notice Statutory Type</th>
                  <th className="py-3 px-4">Target VASP & Nodal</th>
                  <th className="py-3 px-4">Case / Ack ID</th>
                  <th className="py-3 px-4">Subject Addresses</th>
                  <th className="py-3 px-4">Statutory SLA</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {isLoadingNotices ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-outline font-mono">
                      <span className="material-symbols-outlined text-[24px] animate-spin text-primary block mb-2">sync</span>
                      Loading statutory notices...
                    </td>
                  </tr>
                ) : notices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-outline">
                      No statutory notices found.
                    </td>
                  </tr>
                ) : (
                  notices.map((n) => {
                    const isOverdue = new Date(n.complianceDeadline).getTime() < Date.now();
                    return (
                      <tr key={n.id} className="hover:bg-surface-container/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-primary whitespace-nowrap">
                          <div>{n.noticeNo}</div>
                          <div className="text-[10px] text-outline font-sans mt-0.5">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              n.noticeType === 'SECTION_107_BNSS'
                                ? 'bg-red-950/60 border-red-500/50 text-red-400'
                                : 'bg-primary/20 border-primary/50 text-primary'
                            }`}
                          >
                            {n.noticeType === 'SECTION_107_BNSS'
                              ? 'Sec 107 BNSS (Freeze)'
                              : 'Sec 94 BNSS (Summons)'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-on-surface">{n.targetVaspName}</div>
                          <div className="text-[10px] text-outline font-mono flex items-center gap-1 mt-0.5">
                            <span>{n.nodalOfficerName}</span>
                            <span className="text-primary font-mono">({n.fiuRegistrationNumber})</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <div className="text-on-surface font-semibold">{n.caseId}</div>
                          {n.ncrpAckNo && <div className="text-[10px] text-outline">Ack: {n.ncrpAckNo}</div>}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px]">
                          {n.subjectAddresses.map((addr, idx) => (
                            <div key={idx} className="truncate max-w-[130px]" title={addr}>
                              {addr.substring(0, 6)}...{addr.substring(addr.length - 4)}
                            </div>
                          ))}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {n.status === 'ASSETS_FROZEN' || n.status === 'KYC_RECEIVED' || n.status === 'CLOSED' ? (
                            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              Complied
                            </span>
                          ) : (
                            <div
                              className={`text-[11px] font-mono flex items-center gap-1 ${
                                isOverdue ? 'text-red-400 font-bold' : 'text-amber-400'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">alarm</span>
                              <span>
                                {isOverdue ? 'Overdue' : `${Math.max(1, Math.round((new Date(n.complianceDeadline).getTime() - Date.now()) / 3600000))}h SLA`}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              n.status === 'ASSETS_FROZEN'
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                                : n.status === 'KYC_RECEIVED'
                                ? 'bg-blue-950/60 border-blue-500/50 text-blue-400'
                                : n.status === 'COMPLIANCE_IN_PROGRESS'
                                ? 'bg-amber-950/60 border-amber-500/50 text-amber-400'
                                : 'bg-surface-container border-outline-variant text-outline'
                            }`}
                          >
                            {n.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Notice Document */}
                            <button
                              onClick={() => setSelectedNotice(n)}
                              className="btn-secondary py-1 px-2 text-[11px] rounded flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[13px]">description</span>
                              <span>View Notice</span>
                            </button>

                            {/* Record Compliance */}
                            <button
                              onClick={() => {
                                setSelectedNotice(n);
                                setShowComplianceUpdateModal(true);
                              }}
                              className="btn-primary py-1 px-2 text-[11px] rounded flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[13px]">fact_check</span>
                              <span>Update</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: INTER-AGENCY WORKSPACES & BULLETINS
          ============================================================ */}
      {activeTab === 'workspaces' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Active Joint Task Forces */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider font-sans">
                Active Multi-Agency Operations ({workspaces.length})
              </h3>
              <button
                onClick={() => setShowNewWorkspaceModal(true)}
                className="btn-secondary text-xs px-2.5 py-1 rounded flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                New Joint Task Force
              </button>
            </div>

            {isLoadingWorkspaces ? (
              <div className="surface-level-1 p-8 rounded-lg border border-outline-variant text-center font-mono text-outline">
                Loading joint task forces...
              </div>
            ) : (
              workspaces.map((ws) => (
                <div key={ws.id} className="surface-level-1 border border-outline-variant rounded-lg p-5 space-y-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary bg-primary/20 border border-primary/40 px-2 py-0.5 rounded">
                          {ws.operationCode}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            ws.priority === 'critical' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400'
                          }`}
                        >
                          {ws.priority} Priority
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-on-surface mt-2">{ws.title}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                      {ws.status}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed">{ws.description}</p>

                  <div className="border-t border-outline-variant/40 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-outline uppercase tracking-wider font-sans block mb-1">
                        Lead & Participating Agencies:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="bg-primary-container text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                          ★ {ws.leadAgency}
                        </span>
                        {ws.participatingAgencies.map((agency, i) => (
                          <span key={i} className="bg-surface-container border border-outline-variant text-on-surface-variant text-[10px] px-2 py-0.5 rounded">
                            {agency}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-on-surface font-semibold">{ws.targetWalletsCount} Monitored Wallets</div>
                      <div className="text-[10px] text-emerald-400">
                        ₹{(ws.totalFrozenInr / 10000000).toFixed(2)} Cr Seized
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Intelligence Bulletins */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-sm font-semibold text-on-surface uppercase tracking-wider font-sans">
              National Intelligence Bulletins ({bulletins.length})
            </h3>

            {bulletins.map((bulletin) => (
              <div
                key={bulletin.id}
                className="surface-level-1 border border-outline-variant rounded-lg p-4 space-y-2.5 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[10px] text-primary font-bold">{bulletin.bulletinNumber}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      bulletin.urgency === 'URGENT' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400'
                    }`}
                  >
                    {bulletin.urgency}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-on-surface leading-tight">{bulletin.title}</h4>

                <p className="text-[11px] text-on-surface-variant leading-normal">{bulletin.modusOperandi}</p>

                <div className="pt-2 border-t border-outline-variant/30 flex justify-between items-center text-[10px] font-mono text-outline">
                  <span>Source: {bulletin.authorAgency}</span>
                  <span>{new Date(bulletin.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: VASP NODAL DIRECTORY
          ============================================================ */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-on-surface-variant">
              Officially designated Virtual Asset Service Provider (VASP) Nodal & Compliance Officers registered with FIU-IND for receiving statutory notices under BNSS 2023.
            </p>
            <span className="text-xs font-mono text-primary font-bold">
              {vaspDirectory.length} Registered Exchanges
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vaspDirectory.map((vasp) => (
              <div
                key={vasp.vaspId}
                className="surface-level-1 border border-outline-variant rounded-lg p-4 space-y-3 shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">{vasp.entityName}</h4>
                    <p className="text-[10px] text-outline">{vasp.registeredEntity}</p>
                  </div>
                  <span className="text-[9px] font-mono bg-primary/20 text-primary border border-primary/40 px-1.5 py-0.5 rounded font-semibold">
                    {vasp.fiuRegistrationNumber}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-outline">Nodal Officer:</span>
                    <span className="font-semibold text-on-surface">{vasp.nodalOfficerName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-outline">Email:</span>
                    <a href={`mailto:${vasp.nodalEmail}`} className="font-mono text-primary hover:underline">
                      {vasp.nodalEmail}
                    </a>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-outline">Emergency Hotline:</span>
                    <span className="font-mono text-on-surface">{vasp.emergencyContact}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-outline">Avg Turnaround SLA:</span>
                    <span className="font-mono text-amber-400 font-bold">{vasp.averageSlaHours} Hours</span>
                  </div>
                </div>

                <div className="border-t border-outline-variant/40 pt-3 flex justify-between items-center">
                  <a
                    href={vasp.lawEnforcementPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    <span>LEA Portal</span>
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>

                  <button
                    onClick={() => {
                      setShowDispatchNoticeModal(true);
                    }}
                    className="btn-primary py-1 px-2 text-[11px] rounded font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px]">send</span>
                    <span>Issue Notice</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 1: NCRP COMPLAINT DETAILS & CROSS-CORRELATION
          ============================================================ */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="surface-level-1 border border-outline-variant rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-start border-b border-outline-variant pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary text-base">
                    NCRP #{selectedComplaint.acknowledgmentNo}
                  </span>
                  <span className="text-[10px] bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 rounded font-mono">
                    {selectedComplaint.status}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {selectedComplaint.policeStation} • {selectedComplaint.state}
                </p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="p-1 rounded text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-surface-container rounded-lg font-mono">
              <div>
                <span className="text-[10px] text-outline block">Defrauded INR:</span>
                <span className="text-sm font-bold text-on-surface">₹{selectedComplaint.fraudAmountInr.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-outline block">USD Equivalent:</span>
                <span className="text-sm font-bold text-primary">${selectedComplaint.fraudAmountUsd.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-outline block">Complainant:</span>
                <span className="text-sm font-semibold text-on-surface font-sans">{selectedComplaint.complainantName}</span>
              </div>
            </div>

            {/* Suspect Wallets */}
            <div>
              <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider font-sans mb-2">
                Reported Suspect Blockchain Addresses
              </h4>
              <div className="space-y-2">
                {selectedComplaint.suspectWallets.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-surface-container border border-outline-variant/60 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-primary/20 text-primary font-bold text-[9px] px-1.5 py-0.2 rounded">
                          {w.blockchain} • {w.layer}
                        </span>
                        <span className="text-on-surface select-all">{w.address}</span>
                      </div>
                      <div className="text-[10px] text-outline mt-1 font-sans">
                        Attributed Entity: <span className="text-on-surface font-semibold">{w.attributedEntity || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-red-400 font-bold block">Risk: {w.riskScore}/100</span>
                      <button
                        onClick={() => navigate(`/wallet/${w.address}`)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Inspect Wallet →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mule Bank Accounts */}
            {selectedComplaint.bankTrail.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider font-sans mb-2">
                  Layer 1 Bank Mule Trail
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedComplaint.bankTrail.map((b, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-surface-container border border-outline-variant/60 text-xs">
                      <div className="flex justify-between items-start font-semibold text-on-surface">
                        <span>{b.bankName}</span>
                        <span className="font-mono text-emerald-400">₹{b.amountInr.toLocaleString()}</span>
                      </div>
                      <div className="text-[11px] font-mono text-outline mt-1">A/C: {b.accountNumberMasked}</div>
                      <div className="text-[10px] font-mono text-outline">UTR: {b.utrNumber}</div>
                      <span className="mt-1 inline-block text-[9px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded">
                        {b.freezeStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes & Actions */}
            {selectedComplaint.notes && (
              <div className="text-xs text-on-surface-variant bg-surface-container p-3 rounded">
                <span className="text-outline font-semibold block text-[10px] uppercase tracking-wider mb-1">
                  Investigator Intake Notes:
                </span>
                {selectedComplaint.notes}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
              <button
                onClick={() => handleRapidFreeze(selectedComplaint.id)}
                className="btn-secondary px-3.5 py-1.5 text-xs rounded flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                1930 Rapid Freeze
              </button>
              <button
                onClick={() => handleImportToCase(selectedComplaint)}
                className="btn-primary px-3.5 py-1.5 text-xs rounded font-semibold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">hub</span>
                Initialize Investigation Case
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: OFFICIAL SAHYOG STATUTORY NOTICE VIEWER & PRINT
          ============================================================ */}
      {selectedNotice && !showComplianceUpdateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="surface-level-1 border border-outline-variant rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* National Notice Header */}
            <div className="border-b-2 border-outline-variant pb-4 text-center space-y-1 relative">
              <div className="text-center font-bold uppercase tracking-widest text-[11px] text-primary">
                Government of India // Ministry of Home Affairs
              </div>
              <div className="text-xs font-semibold text-outline uppercase tracking-wider">
                Indian Cyber Crime Coordination Centre (I4C) — SAHYOG Coordination
              </div>
              <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight mt-1">
                Statutory Notice Under{' '}
                {selectedNotice.noticeType === 'SECTION_107_BNSS'
                  ? 'Section 107 BNSS, 2023'
                  : 'Section 94 BNSS, 2023'}
              </h3>
              <div className="text-[10px] font-mono text-outline">
                Notice Reference: <span className="text-on-surface font-bold">{selectedNotice.noticeNo}</span> • Case:{' '}
                <span className="text-on-surface font-bold">{selectedNotice.caseId}</span>
              </div>
            </div>

            {/* Addressed To */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-surface-container p-3.5 rounded-lg border border-outline-variant/60">
              <div>
                <span className="text-[10px] text-outline uppercase tracking-wider block font-semibold">To (VASP Nodal Officer):</span>
                <div className="font-bold text-on-surface mt-0.5">{selectedNotice.nodalOfficerName}</div>
                <div className="text-outline">{selectedNotice.targetVaspName}</div>
                <div className="font-mono text-primary text-[11px]">{selectedNotice.nodalOfficerEmail}</div>
                <div className="font-mono text-outline text-[10px]">FIU Reg: {selectedNotice.fiuRegistrationNumber}</div>
              </div>
              <div>
                <span className="text-[10px] text-outline uppercase tracking-wider block font-semibold">From (Issuing Authority):</span>
                <div className="font-bold text-on-surface mt-0.5">{selectedNotice.investigatingOfficerName}</div>
                <div className="text-outline">{selectedNotice.investigatingOfficerDesignation} ({selectedNotice.investigatingOfficerBadge})</div>
                <div className="text-outline">{selectedNotice.policeStation}</div>
                <div className="text-[10px] text-outline">{selectedNotice.issuingAgency}</div>
              </div>
            </div>

            {/* Statutory Order Body */}
            <div className="space-y-3 text-xs leading-relaxed text-on-surface">
              <p>
                <strong>WHEREAS</strong>, an investigation is in progress into serious cyber financial crimes and digital asset laundering registered under Case Identifier <strong>{selectedNotice.caseId}</strong>.
              </p>
              <p>
                <strong>NOW THEREFORE</strong>, by virtue of statutory powers conferred under{' '}
                <strong>
                  {selectedNotice.noticeType === 'SECTION_107_BNSS'
                    ? 'Section 107 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023'
                    : 'Section 94 of Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023'}
                </strong>, you are hereby directed to forthwith execute the following statutory actions:
              </p>

              <div className="p-3 bg-surface-container rounded border-l-2 border-primary space-y-1.5">
                {selectedNotice.demandedActions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px]">
                    <span className="font-mono text-primary font-bold">{idx + 1}.</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>

              {/* Subject Addresses */}
              <div className="p-3 bg-surface-container rounded font-mono text-[11px] space-y-1">
                <span className="text-[10px] text-outline uppercase tracking-wider font-sans block">
                  Subject Target Blockchain Addresses & Hashes:
                </span>
                {selectedNotice.subjectAddresses.map((addr, idx) => (
                  <div key={idx} className="text-primary font-bold select-all">
                    • {addr}
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Seal & Verification QR */}
            <div className="border-t border-outline-variant pt-4 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-outline block">SHA-256 Digital Verification Seal:</span>
                <span className="text-[10px] text-primary font-bold truncate max-w-[400px] block select-all">
                  {selectedNotice.digitalSealHash}
                </span>
                <span className="text-[10px] text-outline mt-1 block">
                  Deadline SLA: {new Date(selectedNotice.complianceDeadline).toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="btn-secondary px-3 py-1.5 text-xs rounded flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  Print Notice Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: DISPATCH STATUTORY NOTICE WIZARD
          ============================================================ */}
      {showDispatchNoticeModal && (
        <NoticeDispatchWizardModal
          vaspDirectory={vaspDirectory}
          activeCases={activeCases}
          complaints={complaints}
          onClose={() => setShowDispatchNoticeModal(false)}
          onDispatched={(newNotice) => {
            setNotices((prev) => [newNotice, ...prev]);
            setShowDispatchNoticeModal(false);
            notify('success', `Statutory notice ${newNotice.noticeNo} dispatched successfully!`);
          }}
        />
      )}

      {/* ============================================================
          MODAL 4: ACTION TAKEN REPORT (ATR) & SEC 63 BSA CERTIFICATE
          ============================================================ */}
      {showAtrModal && atrTargetComplaint && (
        <AtrGeneratorModal
          complaint={atrTargetComplaint}
          onClose={() => {
            setShowAtrModal(false);
            setAtrTargetComplaint(null);
          }}
          onGenerated={(atr) => {
            setShowAtrModal(false);
            setAtrTargetComplaint(null);
            refreshComplaints();
            notify('success', `Action Taken Report ${atr.atrId} submitted under Section 63 BSA!`);
          }}
        />
      )}

      {/* ============================================================
          MODAL 5: RECORD COMPLIANCE RESPONSE
          ============================================================ */}
      {showComplianceUpdateModal && selectedNotice && (
        <ComplianceUpdateModal
          notice={selectedNotice}
          onClose={() => setShowComplianceUpdateModal(false)}
          onUpdated={(updated) => {
            setNotices((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
            setShowComplianceUpdateModal(false);
            notify('success', `Compliance status updated for ${updated.noticeNo}!`);
          }}
        />
      )}

      {/* ============================================================
          MODAL 6: NEW NCRP COMPLAINT INTAKE
          ============================================================ */}
      {showNewComplaintModal && (
        <NewNcrpComplaintModal
          onClose={() => setShowNewComplaintModal(false)}
          onCreated={(newComp) => {
            setComplaints((prev) => [newComp, ...prev]);
            setShowNewComplaintModal(false);
            notify('success', `NCRP Complaint #${newComp.acknowledgmentNo} successfully ingested!`);
          }}
        />
      )}

      {/* ============================================================
          MODAL 7: NEW INTER-AGENCY WORKSPACE
          ============================================================ */}
      {showNewWorkspaceModal && (
        <NewWorkspaceModal
          onClose={() => setShowNewWorkspaceModal(false)}
          onCreated={(newWs) => {
            setWorkspaces((prev) => [newWs, ...prev]);
            setShowNewWorkspaceModal(false);
            notify('success', `Operation ${newWs.operationCode} initialized!`);
          }}
        />
      )}
    </div>
  );
};

/* ============================================================
   SUB-COMPONENT: NOTICE DISPATCH WIZARD MODAL
   ============================================================ */
interface NoticeDispatchWizardModalProps {
  vaspDirectory: VaspNodalContact[];
  activeCases: Case[];
  complaints: NcrpComplaint[];
  onClose: () => void;
  onDispatched: (notice: SahyogNotice) => void;
}

const NoticeDispatchWizardModal: React.FC<NoticeDispatchWizardModalProps> = ({
  vaspDirectory,
  activeCases,
  complaints,
  onClose,
  onDispatched,
}) => {
  const [noticeType, setNoticeType] = useState<StatutoryNoticeType>('SECTION_94_BNSS');
  const [targetVaspId, setTargetVaspId] = useState<string>(vaspDirectory[0]?.vaspId || 'vasp-coindcx');
  const [caseId, setCaseId] = useState<string>(activeCases[0]?.caseId || 'INV-2023-0842');
  const [ncrpAckNo, setNcrpAckNo] = useState<string>(complaints[0]?.acknowledgmentNo || '');
  const [subjectAddress, setSubjectAddress] = useState<string>('');
  const [deadlineHours, setDeadlineHours] = useState<number>(24);
  const [policeStation, setPoliceStation] = useState<string>('Cyber Crime Police Station, South-West Delhi');
  const [designation, setDesignation] = useState<string>('Senior Cyber Forensic Inspector');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill address when case selected
  useEffect(() => {
    const matched = activeCases.find((c) => c.caseId === caseId);
    if (matched && matched.targetAddress) {
      setSubjectAddress(matched.targetAddress);
    }
  }, [caseId, activeCases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subjectAddress.trim()) {
      setError('Please provide at least one subject wallet address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const notice = await NcrpSahyogService.dispatchNotice({
        noticeType,
        caseId,
        ncrpAckNo: ncrpAckNo || undefined,
        targetVaspId,
        subjectAddresses: [subjectAddress.trim()],
        deadlineHours,
        policeStation,
        designation,
      });
      onDispatched(notice);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch notice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="surface-level-1 border border-outline-variant rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex justify-between items-start border-b border-outline-variant pb-3">
          <div>
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">gavel</span>
              Dispatch Statutory VASP Notice
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Issue formal legal directive under Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 to designated exchange nodal officer.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Statutory Section Type */}
          <div>
            <label className="text-[11px] text-outline font-semibold uppercase tracking-wider block mb-1">
              Statutory Power & Notice Type:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all ${
                  noticeType === 'SECTION_94_BNSS'
                    ? 'bg-primary/10 border-primary text-on-surface'
                    : 'bg-surface-container border-outline-variant text-on-surface-variant'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <input
                    type="radio"
                    name="noticeType"
                    checked={noticeType === 'SECTION_94_BNSS'}
                    onChange={() => setNoticeType('SECTION_94_BNSS')}
                  />
                  <span>Section 94 BNSS</span>
                </div>
                <span className="text-[11px] text-outline">
                  Summons to produce KYC, bank records, IP access logs, and withdrawal transaction ledger.
                </span>
              </label>

              <label
                className={`p-3 rounded-lg border cursor-pointer flex flex-col gap-1 transition-all ${
                  noticeType === 'SECTION_107_BNSS'
                    ? 'bg-red-950/30 border-red-500 text-on-surface'
                    : 'bg-surface-container border-outline-variant text-on-surface-variant'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <input
                    type="radio"
                    name="noticeType"
                    checked={noticeType === 'SECTION_107_BNSS'}
                    onChange={() => setNoticeType('SECTION_107_BNSS')}
                  />
                  <span>Section 107 BNSS</span>
                </div>
                <span className="text-[11px] text-outline">
                  Immediate seizure and freeze order on crypto assets, account lien-marking, and escrow lock.
                </span>
              </label>
            </div>
          </div>

          {/* Row: Target VASP & Case */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-outline font-semibold uppercase tracking-wider block mb-1">
                Target VASP Entity:
              </label>
              <select
                value={targetVaspId}
                onChange={(e) => setTargetVaspId(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-3 py-2 text-xs text-on-surface font-sans"
              >
                {vaspDirectory.map((v) => (
                  <option key={v.vaspId} value={v.vaspId}>
                    {v.entityName} ({v.fiuRegistrationNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-outline font-semibold uppercase tracking-wider block mb-1">
                Linked CryptoTrace Case:
              </label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-3 py-2 text-xs text-on-surface font-sans"
              >
                {activeCases.map((c) => (
                  <option key={c.caseId} value={c.caseId}>
                    {c.caseId} — {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Wallet */}
          <div>
            <label className="text-[11px] text-outline font-semibold uppercase tracking-wider block mb-1">
              Subject Blockchain Address (Suspect / Deposit):
            </label>
            <input
              type="text"
              value={subjectAddress}
              onChange={(e) => setSubjectAddress(e.target.value)}
              placeholder="e.g. 0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
              className="w-full bg-surface-container border border-outline-variant rounded px-3 py-2 text-xs font-mono text-on-surface"
              required
            />
          </div>

          {/* Row: NCRP Ack & SLA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-outline font-semibold uppercase tracking-wider block mb-1">
                NCRP Acknowledgment No (Optional):
              </label>
              <input
                type="text"
                value={ncrpAckNo}
                onChange={(e) => setNcrpAckNo(e.target.value)}
                placeholder="e.g. 20241029001928"
                className="w-full bg-surface-container border border-outline-variant rounded px-3 py-2 text-xs font-mono text-on-surface"
              />
            </div>

            <div>
              <label className="text-[11px] text-outline font-semibold uppercase tracking-wider block mb-1">
                Statutory Compliance SLA:
              </label>
              <select
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Number(e.target.value))}
                className="w-full bg-surface-container border border-outline-variant rounded px-3 py-2 text-xs text-on-surface font-sans"
              >
                <option value={12}>12 Hours (Emergency Freeze)</option>
                <option value={24}>24 Hours (Standard Statutory)</option>
                <option value={48}>48 Hours (Full Ledger Production)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-xs rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-4 py-2 text-xs rounded font-semibold flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Generating Seal...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Digitally Sign & Dispatch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   SUB-COMPONENT: ATR GENERATOR MODAL (SECTION 63 BSA)
   ============================================================ */
interface AtrGeneratorModalProps {
  complaint: NcrpComplaint;
  onClose: () => void;
  onGenerated: (atr: ActionTakenReport) => void;
}

const AtrGeneratorModal: React.FC<AtrGeneratorModalProps> = ({ complaint, onClose, onGenerated }) => {
  const [summary, setSummary] = useState<string>(
    `On-chain trace completed via CryptoTrace Intelligence. Stolen funds from NCRP #${complaint.acknowledgmentNo} traced through ${complaint.suspectWallets.length} hops into identified exchange deposit wallets.`
  );
  const [fundPath, setFundPath] = useState<string>(
    `Victim -> Mule A/C -> P2P Counterparty -> ${complaint.suspectWallets[0]?.address || 'Unhosted Wallet'} -> VASP Hot Wallet`
  );
  const [frozenInr, setFrozenInr] = useState<string>('1420000');
  const [courtRef, setCourtRef] = useState<string>(`BSA-SEC63-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const atr = await NcrpSahyogService.exportAtr({
        complaintId: complaint.id,
        summaryOfInvestigation: summary,
        fundTracingPathSummary: fundPath,
        identifiedVasps: ['CoinDCX', 'Binance India Liaison'],
        totalFrozenAmountInr: Number(frozenInr),
        courtNoticeReference: courtRef,
      });
      onGenerated(atr);
    } catch (err) {
      console.warn('ATR generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="surface-level-1 border border-outline-variant rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start border-b border-outline-variant pb-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified</span>
              Submit NCRP Action Taken Report (ATR)
            </h3>
            <p className="text-[11px] text-outline mt-0.5">
              Generates official court certificate under Section 63/65B Bharatiya Sakshya Adhiniyam (BSA).
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleGenerate} className="space-y-3 text-xs font-sans">
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
              Summary of Forensic Investigation:
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded p-2 text-xs text-on-surface font-sans"
              required
            />
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
              Hop-by-Hop Fund Flow Path:
            </label>
            <input
              type="text"
              value={fundPath}
              onChange={(e) => setFundPath(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Total Frozen Amount (INR):
              </label>
              <input
                type="number"
                value={frozenInr}
                onChange={(e) => setFrozenInr(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
              />
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Court Docket Reference:
              </label>
              <input
                type="text"
                value={courtRef}
                onChange={(e) => setCourtRef(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
            <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs rounded">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="btn-primary px-3 py-1.5 text-xs rounded font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>Sign & Submit ATR</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   SUB-COMPONENT: COMPLIANCE UPDATE MODAL
   ============================================================ */
interface ComplianceUpdateModalProps {
  notice: SahyogNotice;
  onClose: () => void;
  onUpdated: (notice: SahyogNotice) => void;
}

const ComplianceUpdateModal: React.FC<ComplianceUpdateModalProps> = ({ notice, onClose, onUpdated }) => {
  const [status, setStatus] = useState<string>(notice.status);
  const [kycName, setKycName] = useState<string>(notice.responseSummary?.kycIdentifiedName || '');
  const [frozenUsd, setFrozenUsd] = useState<string>(String(notice.responseSummary?.frozenAmountUsd || ''));
  const [frozenInr, setFrozenInr] = useState<string>(String(notice.responseSummary?.frozenAmountInr || ''));
  const [seizureRef, setSeizureRef] = useState<string>(notice.responseSummary?.seizureReferenceNo || '');
  const [remarks, setRemarks] = useState<string>(notice.responseSummary?.remarks || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const updated = await NcrpSahyogService.updateNoticeStatus(notice.id, status, {
        kycIdentifiedName: kycName.trim() || undefined,
        frozenAmountUsd: frozenUsd ? Number(frozenUsd) : undefined,
        frozenAmountInr: frozenInr ? Number(frozenInr) : undefined,
        seizureReferenceNo: seizureRef.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      onUpdated(updated);
    } catch (err) {
      console.warn('Failed to update notice status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="surface-level-1 border border-outline-variant rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start border-b border-outline-variant pb-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Record VASP Compliance Response</h3>
            <p className="text-[11px] font-mono text-primary mt-0.5">{notice.noticeNo}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-3 text-xs font-sans">
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
              New Compliance Status:
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface font-sans"
            >
              <option value="COMPLIANCE_IN_PROGRESS">COMPLIANCE IN PROGRESS</option>
              <option value="KYC_RECEIVED">KYC RECEIVED</option>
              <option value="ASSETS_FROZEN">ASSETS FROZEN</option>
              <option value="NON_COMPLIANT">NON COMPLIANT</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
              Identified Off-Chain Identity (KYC):
            </label>
            <input
              type="text"
              value={kycName}
              onChange={(e) => setKycName(e.target.value)}
              placeholder="e.g. Rameshwar Alok (PAN: ABCPA1234F)"
              className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Frozen Crypto USD:
              </label>
              <input
                type="number"
                value={frozenUsd}
                onChange={(e) => setFrozenUsd(e.target.value)}
                placeholder="42500"
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
              />
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Frozen Amount INR:
              </label>
              <input
                type="number"
                value={frozenInr}
                onChange={(e) => setFrozenInr(e.target.value)}
                placeholder="3500000"
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
              VASP Seizure Docket / Reference:
            </label>
            <input
              type="text"
              value={seizureRef}
              onChange={(e) => setSeizureRef(e.target.value)}
              placeholder="e.g. CDX-SEZ-2026-904"
              className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
            />
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
              Remarks & Escrow Confirmation:
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Account frozen, hard block applied to unhosted withdrawals..."
              className="w-full bg-surface-container border border-outline-variant rounded p-2 text-xs text-on-surface font-sans"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
            <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs rounded">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="btn-primary px-3 py-1.5 text-xs rounded font-semibold"
            >
              Update Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   SUB-COMPONENT: NEW NCRP COMPLAINT INTAKE MODAL
   ============================================================ */
interface NewNcrpComplaintModalProps {
  onClose: () => void;
  onCreated: (complaint: NcrpComplaint) => void;
}

const NewNcrpComplaintModal: React.FC<NewNcrpComplaintModalProps> = ({ onClose, onCreated }) => {
  const [ackNo, setAckNo] = useState<string>(`${new Date().getFullYear()}${Math.floor(1000000000 + Math.random() * 9000000000)}`);
  const [complainant, setComplainant] = useState<string>('');
  const [contact, setContact] = useState<string>('+91 98');
  const [state, setState] = useState<string>('Delhi');
  const [policeStation, setPoliceStation] = useState<string>('Cyber Crime PS, South-West Delhi');
  const [crimeCategory, setCrimeCategory] = useState<string>('Task-Based Fraud / Pig Butchering');
  const [amountInr, setAmountInr] = useState<string>('2500000');
  const [suspectAddress, setSuspectAddress] = useState<string>('');
  const [blockchain, setBlockchain] = useState<'Ethereum' | 'Bitcoin' | 'Tron'>('Ethereum');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complainant.trim() || !amountInr) return;

    setIsSubmitting(true);
    try {
      const newComp = await NcrpSahyogService.createComplaint({
        acknowledgmentNo: ackNo,
        complainantName: complainant.trim(),
        complainantContact: contact.trim(),
        state,
        policeStation,
        crimeCategory: crimeCategory as any,
        fraudAmountInr: Number(amountInr),
        suspectWallets: suspectAddress.trim()
          ? [
              {
                address: suspectAddress.trim(),
                blockchain: blockchain as any,
                layer: 'L1 Deposit',
                reportedLossInr: Number(amountInr),
                reportedLossUsd: Math.round(Number(amountInr) / 83.33),
                riskScore: 85,
              },
            ]
          : [],
        notes: notes.trim() || undefined,
      });
      onCreated(newComp);
    } catch (err) {
      console.warn('Failed to ingest complaint:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="surface-level-1 border border-outline-variant rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start border-b border-outline-variant pb-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Intake NCRP Complaint Ticket</h3>
            <p className="text-[11px] text-outline mt-0.5">
              Simulate or manually register a 1930 / cybercrime.gov.in financial cyber fraud report.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                NCRP Acknowledgment No:
              </label>
              <input
                type="text"
                value={ackNo}
                onChange={(e) => setAckNo(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Crime Sub-Category:
              </label>
              <select
                value={crimeCategory}
                onChange={(e) => setCrimeCategory(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
              >
                <option value="Task-Based Fraud / Pig Butchering">Task Fraud / Pig Butchering</option>
                <option value="Cryptocurrency Investment Scam">Crypto Investment Scam</option>
                <option value="P2P Escrow Fraud">P2P Escrow Fraud</option>
                <option value="Fake Exchange / Cloud Mining dApp">Fake Exchange / dApp</option>
                <option value="Ransomware / Extortion">Ransomware</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Complainant Name:
              </label>
              <input
                type="text"
                value={complainant}
                onChange={(e) => setComplainant(e.target.value)}
                placeholder="e.g. Ramesh Gupta"
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Defrauded Amount (INR):
              </label>
              <input
                type="number"
                value={amountInr}
                onChange={(e) => setAmountInr(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Jurisdiction State:
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
              >
                <option value="Delhi">Delhi</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Telangana">Telangana</option>
                <option value="Gujarat">Gujarat</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
                Cyber Police Station:
              </label>
              <input
                type="text"
                value={policeStation}
                onChange={(e) => setPoliceStation(e.target.value)}
                className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">
              Reported Suspect Crypto Address:
            </label>
            <div className="flex gap-2">
              <select
                value={blockchain}
                onChange={(e) => setBlockchain(e.target.value as any)}
                className="bg-surface-container border border-outline-variant rounded px-2 py-1.5 text-xs text-on-surface"
              >
                <option value="Ethereum">ETH</option>
                <option value="Bitcoin">BTC</option>
                <option value="Tron">TRON</option>
              </select>
              <input
                type="text"
                value={suspectAddress}
                onChange={(e) => setSuspectAddress(e.target.value)}
                placeholder="0x..."
                className="flex-1 bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
            <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs rounded">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-3 py-1.5 text-xs rounded font-semibold"
            >
              Register NCRP Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   SUB-COMPONENT: NEW WORKSPACE MODAL
   ============================================================ */
interface NewWorkspaceModalProps {
  onClose: () => void;
  onCreated: (ws: SahyogWorkspace) => void;
}

const NewWorkspaceModal: React.FC<NewWorkspaceModalProps> = ({ onClose, onCreated }) => {
  const [code, setCode] = useState<string>('OP-SYNDICATE-DELHI');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;

    setIsSubmitting(true);
    try {
      const ws = await NcrpSahyogService.createWorkspace({
        operationCode: code,
        title: title.trim(),
        description: description.trim() || 'Joint multi-agency cyber investigation operation.',
        participatingAgencies: ['Delhi Police Cyber Cell', 'CBI Cyber Crime Division', 'T-CSB'],
        priority: 'high',
      });
      onCreated(ws);
    } catch (err) {
      console.warn('Failed to create workspace:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
      <div className="surface-level-1 border border-outline-variant rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start border-b border-outline-variant pb-3">
          <h3 className="text-sm font-bold text-on-surface">Initiate Joint Task Force Workspace</h3>
          <button onClick={onClose} className="p-1 rounded text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs font-sans">
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">Operation Code:</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs font-mono text-on-surface"
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">Operation Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Operation Hawk: Inter-State Phishing Ring"
              className="w-full bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface"
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-outline uppercase tracking-wider block mb-1">Scope & Intelligence:</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded p-2 text-xs text-on-surface font-sans"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
            <button type="button" onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs rounded">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary px-3 py-1.5 text-xs rounded font-semibold">
              Create Operation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
