/**
 * CryptoTrace Intelligence Platform — System Settings API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission, requireRole } from '../security/rbac';
import { validateBody, updateSettingsSchema } from '../security/validation';
import { mockStore } from '../data/mockStore';
import { auditService } from '../security/auditService';

export const settingsRouter = Router();

/**
 * GET /api/v1/settings
 * Read current node RPC endpoints and system configurations.
 */
settingsRouter.get('/', requireAuth, requirePermission('settings:read'), (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: mockStore.systemSettings,
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUT /api/v1/settings
 * High-privilege administrative action: Modify blockchain RPC endpoints and AI model connections.
 * Strictly restricted to Admin role.
 */
settingsRouter.put(
  '/',
  requireAuth,
  requireRole('Admin'),
  requirePermission('settings:manage'),
  validateBody(updateSettingsSchema),
  (req: Request, res: Response): void => {
    const { ethRpcUrl, btcRpcUrl, solanaRpcUrl, aiAssistantEnabled } = req.body;

    const previous = { ...mockStore.systemSettings };

    if (ethRpcUrl !== undefined) mockStore.systemSettings.ethRpcUrl = ethRpcUrl;
    if (btcRpcUrl !== undefined) mockStore.systemSettings.btcRpcUrl = btcRpcUrl;
    if (solanaRpcUrl !== undefined) mockStore.systemSettings.solanaRpcUrl = solanaRpcUrl;
    if (aiAssistantEnabled !== undefined) mockStore.systemSettings.aiAssistantEnabled = aiAssistantEnabled;
    mockStore.systemSettings.updatedAt = new Date().toISOString();

    auditService.log({
      action: 'SYSTEM_SETTINGS_MODIFIED',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      ipAddress: req.socket.remoteAddress,
      details: {
        previous_settings: previous,
        updated_settings: mockStore.systemSettings,
      },
    });

    res.json({
      success: true,
      data: mockStore.systemSettings,
      timestamp: new Date().toISOString(),
    });
  }
);
