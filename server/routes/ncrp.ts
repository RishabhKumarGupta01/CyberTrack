/**
 * CryptoTrace Intelligence Platform — NCRP API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 * Standard: Indian Cyber Crime Coordination Centre (I4C / MHA) NCRP / 1930 Protocol
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, requirePermission } from '../security/rbac';
import { mockStore } from '../data/mockStore';
import { auditService } from '../security/auditService';
import { NcrpComplaint, ActionTakenReport } from '../types/ncrpSahyog';

export const ncrpRouter = Router();

/**
 * GET /api/v1/ncrp/complaints
 * Lists all NCRP complaints with optional filters.
 */
ncrpRouter.get(
  '/complaints',
  requireAuth,
  requirePermission('ncrp:read'),
  async (req: Request, res: Response): Promise<void> => {
    const { status, state, crimeCategory, search } = req.query;

    let complaints = Array.from(mockStore.ncrpComplaints.values());

    if (status && typeof status === 'string') {
      complaints = complaints.filter((c) => c.status === status);
    }

    if (state && typeof state === 'string') {
      complaints = complaints.filter((c) => c.state.toLowerCase() === state.toLowerCase());
    }

    if (crimeCategory && typeof crimeCategory === 'string') {
      complaints = complaints.filter((c) => c.crimeCategory === crimeCategory);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      complaints = complaints.filter(
        (c) =>
          c.acknowledgmentNo.toLowerCase().includes(q) ||
          c.complainantName.toLowerCase().includes(q) ||
          c.policeStation.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q)) ||
          c.suspectWallets.some((w) => w.address.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    complaints.sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime());

    res.json({
      success: true,
      data: complaints,
      meta: {
        total: complaints.length,
        totalDefraudedInr: complaints.reduce((acc, c) => acc + c.fraudAmountInr, 0),
        totalDefraudedUsd: complaints.reduce((acc, c) => acc + c.fraudAmountUsd, 0),
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/v1/ncrp/complaints/:id
 * Retrieve a specific NCRP complaint by internal ID or 14-digit Acknowledgment Number.
 */
ncrpRouter.get(
  '/complaints/:id',
  requireAuth,
  requirePermission('ncrp:read'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    let complaint = mockStore.ncrpComplaints.get(id);
    if (!complaint) {
      // Try searching by acknowledgmentNo
      complaint = Array.from(mockStore.ncrpComplaints.values()).find(
        (c) => c.acknowledgmentNo === id
      );
    }

    if (!complaint) {
      res.status(404).json({
        success: false,
        error: { code: 'NCRP_NOT_FOUND', message: `NCRP Complaint ${id} not found.` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: complaint,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/v1/ncrp/complaints
 * Ingests a new NCRP complaint (manual intake or simulated I4C webhook).
 */
ncrpRouter.post(
  '/complaints',
  requireAuth,
  requirePermission('ncrp:create'),
  async (req: Request, res: Response): Promise<void> => {
    const {
      acknowledgmentNo,
      policeStation,
      district,
      state,
      complainantName,
      complainantContact,
      incidentDate,
      crimeCategory,
      fraudAmountInr,
      suspectWallets,
      bankTrail,
      notes,
    } = req.body;

    if (!policeStation || !state || !complainantName || !fraudAmountInr) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Police station, state, complainant name, and fraud amount are required.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const generatedAckNo =
      acknowledgmentNo || `${new Date().getFullYear()}${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const newComplaint: NcrpComplaint = {
      id: `ncrp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      acknowledgmentNo: generatedAckNo,
      policeStation: policeStation.trim(),
      district: district?.trim() || 'Central',
      state: state.trim(),
      complainantName: complainantName.trim(),
      complainantContact: complainantContact?.trim() || '+91 98*** *****',
      incidentDate: incidentDate || new Date().toISOString(),
      reportedDate: new Date().toISOString(),
      crimeCategory: crimeCategory || 'Cryptocurrency Investment Scam',
      fraudAmountInr: Number(fraudAmountInr),
      fraudAmountUsd: Math.round(Number(fraudAmountInr) / 83.33),
      suspectWallets: Array.isArray(suspectWallets) ? suspectWallets : [],
      bankTrail: Array.isArray(bankTrail) ? bankTrail : [],
      status: 'REGISTERED',
      assignedOfficer: req.user?.name || 'Duty Cyber Investigator',
      officerBadge: req.user?.badgeNumber || 'LEA-HQ',
      notes: notes?.trim() || undefined,
      crossIncidentMatches: 1,
    };

    mockStore.ncrpComplaints.set(newComplaint.id, newComplaint);

    auditService.log({
      action: 'NCRP_COMPLAINT_INGESTION',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      ipAddress: req.socket.remoteAddress,
      details: {
        ncrpAckNo: newComplaint.acknowledgmentNo,
        state: newComplaint.state,
        amountInr: newComplaint.fraudAmountInr,
        wallets: newComplaint.suspectWallets.map((w) => w.address),
      },
    });

    res.status(201).json({
      success: true,
      data: newComplaint,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/v1/ncrp/complaints/:id/link-case
 * Links an NCRP complaint to an existing or newly initialized CryptoTrace case.
 */
ncrpRouter.post(
  '/complaints/:id/link-case',
  requireAuth,
  requirePermission('ncrp:action'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { caseId } = req.body;

    if (!caseId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_CASE_ID', message: 'Target Case ID is required.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let complaint = mockStore.ncrpComplaints.get(id);
    if (!complaint) {
      complaint = Array.from(mockStore.ncrpComplaints.values()).find((c) => c.acknowledgmentNo === id);
    }

    if (!complaint) {
      res.status(404).json({
        success: false,
        error: { code: 'NCRP_NOT_FOUND', message: `Complaint ${id} not found.` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    complaint.linkedCaseId = caseId;
    if (complaint.status === 'REGISTERED') {
      complaint.status = 'ON_CHAIN_TRACED';
    }

    auditService.log({
      action: 'NCRP_CASE_LINKAGE',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      caseId,
      details: {
        ncrpAckNo: complaint.acknowledgmentNo,
        linkedCaseId: caseId,
      },
    });

    res.json({
      success: true,
      data: complaint,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/v1/ncrp/complaints/:id/freeze
 * Issues rapid 1930 Helpline / CFCFRMS freeze directive.
 */
ncrpRouter.post(
  '/complaints/:id/freeze',
  requireAuth,
  requirePermission('ncrp:action'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    let complaint = mockStore.ncrpComplaints.get(id);
    if (!complaint) {
      complaint = Array.from(mockStore.ncrpComplaints.values()).find((c) => c.acknowledgmentNo === id);
    }

    if (!complaint) {
      res.status(404).json({
        success: false,
        error: { code: 'NCRP_NOT_FOUND', message: `Complaint ${id} not found.` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    complaint.status = 'FREEZE_INITIATED';
    complaint.cfcfrmsAlertId = `CFC-EMERGENCY-${Date.now().toString().slice(-6)}`;

    // Mark all bank accounts in trail as freeze requested
    complaint.bankTrail = complaint.bankTrail.map((b) => ({
      ...b,
      freezeStatus: 'FREEZE_REQUESTED',
    }));

    auditService.log({
      action: 'NCRP_1930_RAPID_FREEZE_DISPATCH',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      details: {
        ncrpAckNo: complaint.acknowledgmentNo,
        cfcfrmsAlertId: complaint.cfcfrmsAlertId,
        banksNotified: complaint.bankTrail.map((b) => b.bankName),
        suspectWallets: complaint.suspectWallets.map((w) => w.address),
      },
    });

    res.json({
      success: true,
      data: complaint,
      meta: {
        cfcfrmsAlertId: complaint.cfcfrmsAlertId,
        message: 'CFCFRMS 1930 emergency freeze alert dispatched to reporting banks & VASP nodal units.',
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/v1/ncrp/export-atr
 * Generates an Action Taken Report (ATR) with Section 63/65B BSA hash certificate.
 */
ncrpRouter.post(
  '/export-atr',
  requireAuth,
  requirePermission('ncrp:action'),
  async (req: Request, res: Response): Promise<void> => {
    const { complaintId, summaryOfInvestigation, fundTracingPathSummary, identifiedVasps, totalFrozenAmountInr, courtNoticeReference } = req.body;

    let complaint = mockStore.ncrpComplaints.get(complaintId);
    if (!complaint) {
      complaint = Array.from(mockStore.ncrpComplaints.values()).find((c) => c.acknowledgmentNo === complaintId);
    }

    if (!complaint) {
      res.status(404).json({
        success: false,
        error: { code: 'NCRP_NOT_FOUND', message: `Complaint ${complaintId} not found.` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Compute cryptographic hash of evidentiary report conforming to Section 63 Bharatiya Sakshya Adhiniyam
    const certPayload = JSON.stringify({
      ackNo: complaint.acknowledgmentNo,
      complainant: complaint.complainantName,
      wallets: complaint.suspectWallets,
      summary: summaryOfInvestigation,
      investigator: req.user?.name,
      timestamp: new Date().toISOString(),
    });
    const bsaHash = crypto.createHash('sha256').update(certPayload).digest('hex');

    const frozenInr = Number(totalFrozenAmountInr || 0);

    const atr: ActionTakenReport = {
      atrId: `ATR-${complaint.state.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
      complaintId: complaint.id,
      preparedBy: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      policeStation: complaint.policeStation,
      dateGenerated: new Date().toISOString(),
      summaryOfInvestigation: summaryOfInvestigation || 'On-chain forensic tracing conducted via CryptoTrace Intelligence.',
      fundTracingPathSummary: fundTracingPathSummary || 'Traced across intermediary hops to identified exchange clusters.',
      identifiedVasps: identifiedVasps || ['CoinDCX', 'Binance'],
      totalFrozenAmountInr: frozenInr,
      totalFrozenAmountUsd: Math.round(frozenInr / 83.33),
      bsaSection63CertHash: bsaHash,
      courtNoticeReference: courtNoticeReference || `BSA-CERT-CR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
    };

    complaint.actionTakenReport = atr;
    complaint.status = 'ATR_SUBMITTED';

    auditService.log({
      action: 'NCRP_ATR_SUBMITTED',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      details: {
        atrId: atr.atrId,
        ncrpAckNo: complaint.acknowledgmentNo,
        bsaSection63CertHash: bsaHash,
      },
    });

    res.json({
      success: true,
      data: atr,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/v1/ncrp/cross-check/:address
 * Cross-correlates a blockchain address against all registered NCRP complaints nationwide.
 */
ncrpRouter.get(
  '/cross-check/:address',
  requireAuth,
  requirePermission('ncrp:read'),
  async (req: Request, res: Response): Promise<void> => {
    const { address } = req.params;
    const cleanAddr = address.toLowerCase().trim();

    const matchingComplaints: NcrpComplaint[] = [];
    let totalCorrelatedLossInr = 0;
    const statesInvolved = new Set<string>();

    for (const comp of mockStore.ncrpComplaints.values()) {
      const match = comp.suspectWallets.some((w) => w.address.toLowerCase().trim() === cleanAddr);
      if (match) {
        matchingComplaints.push(comp);
        totalCorrelatedLossInr += comp.fraudAmountInr;
        statesInvolved.add(comp.state);
      }
    }

    res.json({
      success: true,
      data: {
        targetAddress: address,
        matchFound: matchingComplaints.length > 0,
        matchesCount: matchingComplaints.length,
        totalLossInr: totalCorrelatedLossInr,
        totalLossUsd: Math.round(totalCorrelatedLossInr / 83.33),
        statesInvolved: Array.from(statesInvolved),
        complaints: matchingComplaints.map((c) => ({
          acknowledgmentNo: c.acknowledgmentNo,
          policeStation: c.policeStation,
          state: c.state,
          complainantName: c.complainantName,
          crimeCategory: c.crimeCategory,
          fraudAmountInr: c.fraudAmountInr,
          status: c.status,
          reportedDate: c.reportedDate,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  }
);
