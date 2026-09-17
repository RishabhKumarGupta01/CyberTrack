/**
 * CryptoTrace Intelligence Platform — Audit Trail API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../security/rbac';
import { auditService } from '../security/auditService';

export const auditRouter = Router();

/**
 * GET /api/v1/audit/logs
 * Query immutable audit trail records with filters.
 */
auditRouter.get('/logs', requireAuth, requirePermission('audit:read'), (req: Request, res: Response): void => {
  const { caseId, action, limit } = req.query;

  const logs = auditService.getLogs({
    caseId: typeof caseId === 'string' ? caseId : undefined,
    action: typeof action === 'string' ? action : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
  });

  res.json({
    success: true,
    data: logs,
    meta: { total: logs.length },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/audit/verify
 * Cryptographically verifies SHA-256 hash chaining across the entire forensic journal.
 */
auditRouter.get('/verify', requireAuth, requirePermission('audit:verify'), (req: Request, res: Response): void => {
  const result = auditService.verifyChainIntegrity();

  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/audit/logs
 * Record an investigator action into the tamper-evident journal.
 */
auditRouter.post('/logs', requireAuth, (req: Request, res: Response): void => {
  const { action, caseId, walletAddress, txHash, details } = req.body;

  if (!action || typeof action !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_ACTION', message: 'Action string is required.' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const record = auditService.log({
    action,
    userId: req.user!.sub,
    userName: req.user!.name,
    badgeNumber: req.user!.badgeNumber,
    ipAddress: req.socket.remoteAddress,
    caseId,
    walletAddress,
    txHash,
    details: typeof details === 'object' ? details : {},
  });

  res.status(201).json({
    success: true,
    data: record,
    timestamp: new Date().toISOString(),
  });
});
