/**
 * CryptoTrace Intelligence Platform — SAHYOG API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 * Standard: Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 & Inter-Agency Coordination Protocol
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, requirePermission } from '../security/rbac';
import { mockStore } from '../data/mockStore';
import { auditService } from '../security/auditService';
import { SahyogNotice, SahyogWorkspace, StatutoryNoticeType, SahyogNoticeStatus } from '../types/ncrpSahyog';

export const sahyogRouter = Router();

/**
 * GET /api/v1/sahyog/notices
 * List all statutory notices issued to VASPs with optional filters.
 */
sahyogRouter.get(
  '/notices',
  requireAuth,
  requirePermission('sahyog:read'),
  async (req: Request, res: Response): Promise<void> => {
    const { status, noticeType, caseId, vaspId } = req.query;

    let notices = Array.from(mockStore.sahyogNotices.values());

    if (status && typeof status === 'string') {
      notices = notices.filter((n) => n.status === status);
    }

    if (noticeType && typeof noticeType === 'string') {
      notices = notices.filter((n) => n.noticeType === noticeType);
    }

    if (caseId && typeof caseId === 'string') {
      notices = notices.filter((n) => n.caseId === caseId);
    }

    if (vaspId && typeof vaspId === 'string') {
      notices = notices.filter((n) => n.targetVaspId === vaspId);
    }

    // Sort newest first
    notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: notices,
      meta: {
        total: notices.length,
        pendingCompliance: notices.filter((n) => n.status === 'DISPATCHED' || n.status === 'COMPLIANCE_IN_PROGRESS').length,
        kycSecured: notices.filter((n) => n.status === 'KYC_RECEIVED').length,
        frozenDirectives: notices.filter((n) => n.status === 'ASSETS_FROZEN').length,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/v1/sahyog/notices/:id
 * Retrieve notice details by ID or notice number.
 */
sahyogRouter.get(
  '/notices/:id',
  requireAuth,
  requirePermission('sahyog:read'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    let notice = mockStore.sahyogNotices.get(id);
    if (!notice) {
      notice = Array.from(mockStore.sahyogNotices.values()).find((n) => n.noticeNo === id);
    }

    if (!notice) {
      res.status(404).json({
        success: false,
        error: { code: 'NOTICE_NOT_FOUND', message: `SAHYOG Notice ${id} not found.` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: notice,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/v1/sahyog/notices
 * Draft and dispatch a statutory Section 94 BNSS / Section 107 BNSS notice to a VASP.
 */
sahyogRouter.post(
  '/notices',
  requireAuth,
  requirePermission('sahyog:notice'),
  async (req: Request, res: Response): Promise<void> => {
    const {
      noticeType,
      caseId,
      ncrpAckNo,
      targetVaspId,
      subjectAddresses,
      subjectTxHashes,
      demandedActions,
      deadlineHours,
      policeStation,
      designation,
    } = req.body;

    if (!noticeType || !caseId || !targetVaspId || !subjectAddresses || !Array.isArray(subjectAddresses) || subjectAddresses.length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_NOTICE_PAYLOAD', message: 'Notice type, caseId, target VASP, and subject addresses are required.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const vasp = mockStore.vaspNodalDirectory.get(targetVaspId);
    if (!vasp) {
      res.status(404).json({
        success: false,
        error: { code: 'VASP_NOT_FOUND', message: `Target VASP ${targetVaspId} not registered in SAHYOG directory.` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const sectionPrefix = noticeType === 'SECTION_107_BNSS' ? 'SEC107' : 'SEC94';
    const noticeNo = `SAHYOG/LEA/${new Date().getFullYear()}/${sectionPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const hours = Number(deadlineHours || 24);
    const deadline = new Date(now.getTime() + hours * 3600 * 1000).toISOString();

    const digitalSealPayload = JSON.stringify({
      noticeNo,
      noticeType,
      caseId,
      vaspId: targetVaspId,
      addresses: subjectAddresses,
      officer: req.user?.name,
      badge: req.user?.badgeNumber,
      timestamp: now.toISOString(),
    });
    const sealHash = crypto.createHash('sha256').update(digitalSealPayload).digest('hex');

    const defaultDemands =
      noticeType === 'SECTION_107_BNSS'
        ? [
            'Immediate freezing of suspect deposit accounts and unhosted wallet withdrawals under Section 107 BNSS.',
            'Lien-marking of all crypto balances (USDT, BTC, ETH) belonging to target identity.',
            'Preservation of off-chain audit logs and IP session history.',
          ]
        : [
            'Production of KYC documents (Aadhaar, PAN, Bank records, live biometric verification) under Section 94 BNSS.',
            'Complete ledger of INR-crypto transactions and counterparty withdrawal addresses.',
            'Login IP access logs with ISP attribution for past 90 days.',
          ];

    const newNotice: SahyogNotice = {
      id: `sahyog-not-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      noticeNo,
      noticeType: noticeType as StatutoryNoticeType,
      caseId,
      ncrpAckNo: ncrpAckNo || undefined,
      targetVaspId: vasp.vaspId,
      targetVaspName: `${vasp.entityName} (${vasp.registeredEntity})`,
      nodalOfficerName: vasp.nodalOfficerName,
      nodalOfficerEmail: vasp.nodalEmail,
      fiuRegistrationNumber: vasp.fiuRegistrationNumber,
      issuingAgency: req.user?.agency || 'Financial Crimes Cyber Enforcement (SIH)',
      investigatingOfficerName: req.user!.name,
      investigatingOfficerBadge: req.user!.badgeNumber,
      investigatingOfficerDesignation: designation || 'Cyber Forensic Investigator',
      policeStation: policeStation || 'Cyber Crime Police Station',
      subjectAddresses,
      subjectTxHashes: Array.isArray(subjectTxHashes) ? subjectTxHashes : undefined,
      demandedActions: Array.isArray(demandedActions) && demandedActions.length > 0 ? demandedActions : defaultDemands,
      complianceDeadline: deadline,
      status: 'DISPATCHED',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      digitalSealHash: sealHash,
    };

    mockStore.sahyogNotices.set(newNotice.id, newNotice);

    auditService.log({
      action: 'SAHYOG_STATUTORY_NOTICE_DISPATCHED',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      caseId,
      details: {
        noticeNo: newNotice.noticeNo,
        noticeType: newNotice.noticeType,
        targetVasp: newNotice.targetVaspName,
        addresses: newNotice.subjectAddresses,
        digitalSealHash: sealHash,
      },
    });

    res.status(201).json({
      success: true,
      data: newNotice,
      meta: {
        message: `Statutory notice ${newNotice.noticeNo} dispatched to ${vasp.nodalOfficerName} (${vasp.nodalEmail}).`,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * PUT /api/v1/sahyog/notices/:id/status
 * Updates compliance status (e.g. KYC Received, Assets Frozen) and records VASP response payload.
 */
sahyogRouter.put(
  '/notices/:id/status',
  requireAuth,
  requirePermission('sahyog:notice'),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, responseSummary } = req.body;

    let notice = mockStore.sahyogNotices.get(id);
    if (!notice) {
      notice = Array.from(mockStore.sahyogNotices.values()).find((n) => n.noticeNo === id);
    }

    if (!notice) {
      res.status(404).json({
        success: false,
        error: { code: 'NOTICE_NOT_FOUND', message: `Notice ${id} not found.` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (status) {
      notice.status = status as SahyogNoticeStatus;
    }

    if (responseSummary) {
      notice.responseSummary = {
        receivedAt: new Date().toISOString(),
        ...notice.responseSummary,
        ...responseSummary,
      };
    }

    notice.updatedAt = new Date().toISOString();

    auditService.log({
      action: 'SAHYOG_NOTICE_COMPLIANCE_UPDATED',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      caseId: notice.caseId,
      details: {
        noticeNo: notice.noticeNo,
        newStatus: notice.status,
        frozenAmountUsd: notice.responseSummary?.frozenAmountUsd,
      },
    });

    res.json({
      success: true,
      data: notice,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/v1/sahyog/directory
 * Verified directory of VASP Nodal Officers registered with FIU-IND / LEA Liaison.
 */
sahyogRouter.get(
  '/directory',
  requireAuth,
  requirePermission('sahyog:read'),
  async (_req: Request, res: Response): Promise<void> => {
    const directory = Array.from(mockStore.vaspNodalDirectory.values());

    res.json({
      success: true,
      data: directory,
      meta: { total: directory.length },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/v1/sahyog/workspaces
 * Inter-agency joint operations and intelligence bulletins.
 */
sahyogRouter.get(
  '/workspaces',
  requireAuth,
  requirePermission('sahyog:read'),
  async (_req: Request, res: Response): Promise<void> => {
    const workspaces = Array.from(mockStore.sahyogWorkspaces.values());
    const bulletins = Array.from(mockStore.intelligenceBulletins.values());

    res.json({
      success: true,
      data: {
        workspaces,
        bulletins,
      },
      meta: {
        totalWorkspaces: workspaces.length,
        totalBulletins: bulletins.length,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/v1/sahyog/workspaces
 * Create a new multi-agency collaborative task force workspace.
 */
sahyogRouter.post(
  '/workspaces',
  requireAuth,
  requirePermission('sahyog:create'),
  async (req: Request, res: Response): Promise<void> => {
    const { operationCode, title, description, participatingAgencies, priority, targetWalletsCount } = req.body;

    if (!operationCode || !title || !description) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Operation code, title, and description are required.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const newWorkspace: SahyogWorkspace = {
      id: `ws-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      operationCode: operationCode.toUpperCase().trim(),
      title: title.trim(),
      description: description.trim(),
      leadAgency: req.user?.agency || 'Central Cyber Task Force',
      participatingAgencies: Array.isArray(participatingAgencies) ? participatingAgencies : ['Delhi Police', 'Telangana T-CSB'],
      priority: priority || 'high',
      status: 'ACTIVE',
      targetWalletsCount: Number(targetWalletsCount || 1),
      totalDefraudedInr: 0,
      totalFrozenInr: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockStore.sahyogWorkspaces.set(newWorkspace.id, newWorkspace);

    auditService.log({
      action: 'SAHYOG_WORKSPACE_CREATED',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      details: {
        operationCode: newWorkspace.operationCode,
        title: newWorkspace.title,
        agencies: newWorkspace.participatingAgencies,
      },
    });

    res.status(201).json({
      success: true,
      data: newWorkspace,
      timestamp: new Date().toISOString(),
    });
  }
);
