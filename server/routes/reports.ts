/**
 * CryptoTrace Intelligence Platform — Reports API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../security/rbac';
import { validateBody, approveReportSchema } from '../security/validation';
import { auditService } from '../security/auditService';

export const reportsRouter = Router();

/**
 * POST /api/v1/reports/approve
 * High-privilege action: Approves a court-admissible forensic report.
 * Strictly restricted to Lead Investigator or Admin via 'reports:approve' permission.
 */
reportsRouter.post(
  '/approve',
  requireAuth,
  requirePermission('reports:approve'),
  validateBody(approveReportSchema),
  (req: Request, res: Response): void => {
    const { reportId, status, digitalSignature, notes } = req.body;

    auditService.log({
      action: 'REPORT_OFFICIALLY_APPROVED',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      details: {
        report_id: reportId,
        status,
        digital_signature: digitalSignature,
        approver_role: req.user!.role,
        notes,
      },
    });

    res.json({
      success: true,
      data: {
        reportId,
        status,
        approvedBy: req.user!.name,
        badgeNumber: req.user!.badgeNumber,
        role: req.user!.role,
        digitalSignature,
        approvedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  }
);
