/**
 * CryptoTrace Intelligence Platform — Evidence API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, requirePermission } from '../security/rbac';
import { validateBody, sealEvidenceSchema } from '../security/validation';
import { mockStore } from '../data/mockStore';
import { auditService } from '../security/auditService';
import { env } from '../config/env';

export const evidenceRouter = Router();

/**
 * GET /api/v1/evidence
 * List evidence artifacts.
 */
evidenceRouter.get('/', requireAuth, requirePermission('evidence:read'), (req: Request, res: Response): void => {
  const list = Array.from(mockStore.evidence.values());
  res.json({
    success: true,
    data: list,
    meta: { total: list.length },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/evidence/seal
 * Cryptographically seal forensic artifact with HMAC-SHA256 signature and chain-of-custody log.
 */
evidenceRouter.post(
  '/seal',
  requireAuth,
  requirePermission('evidence:seal'),
  validateBody(sealEvidenceSchema),
  (req: Request, res: Response): void => {
    const { evidenceId, caseId, sha256Hash } = req.body;

    // Cryptographic HMAC sealing using server master key
    const hmacSignature = crypto
      .createHmac('sha256', env.HMAC_SECRET_KEY)
      .update(`${evidenceId}:${caseId}:${sha256Hash}:${req.user!.sub}`)
      .digest('hex');

    const item = mockStore.evidence.get(evidenceId);
    if (item) {
      item.chain_of_custody_status = 'SEALED';
      item.hmac_signature = hmacSignature;
      item.verified_by = req.user!.sub;
    }

    auditService.log({
      action: 'EVIDENCE_SEALED',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      caseId,
      details: {
        evidence_id: evidenceId,
        sha256_hash: sha256Hash,
        hmac_signature: hmacSignature,
        sealing_authority: req.user!.role,
      },
    });

    res.json({
      success: true,
      data: {
        evidenceId,
        caseId,
        sha256Hash,
        hmacSignature,
        status: 'SEALED',
        sealedBy: req.user!.name,
        badgeNumber: req.user!.badgeNumber,
        sealedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }
);
