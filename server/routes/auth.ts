/**
 * CryptoTrace Intelligence Platform — Authentication API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 */

import { Router, Request, Response } from 'express';
import { authRateLimiter } from '../security/rateLimiter';
import { validateBody, loginSchema, cacVerifySchema } from '../security/validation';
import { mockStore } from '../data/mockStore';
import { JwtService } from '../security/jwt';
import { auditService } from '../security/auditService';
import { requireAuth } from '../security/rbac';

export const authRouter = Router();

/**
 * POST /api/v1/auth/login
 * Standard credential authentication with rate limiting and bcrypt verification.
 */
authRouter.post(
  '/login',
  authRateLimiter.middleware(),
  validateBody(loginSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const ip = req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const user = mockStore.findUserByEmail(email);

    if (!user) {
      // Safe generic response to prevent user enumeration
      auditService.log({
        action: 'AUTH_FAILURE_UNKNOWN_USER',
        badgeNumber: 'UNKNOWN',
        ipAddress: ip,
        userAgent,
        details: { attempted_email: email, reason: 'Identifier not found' },
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid investigator credentials or account restricted.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const isMatch = await mockStore.verifyPassword(user, password);
    if (!isMatch) {
      auditService.log({
        action: 'AUTH_FAILURE_BAD_PASSWORD',
        userId: user.id,
        userName: user.name,
        badgeNumber: user.badge_number,
        ipAddress: ip,
        userAgent,
        details: { email: user.email, reason: 'Invalid token/password' },
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid investigator credentials or account restricted.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Success: Update last login and generate signed token
    user.last_login_at = new Date().toISOString();
    const safeUser = mockStore.toSafeUser(user);
    const token = JwtService.sign(safeUser);

    auditService.log({
      action: 'AUTH_SUCCESS_PASSWORD',
      userId: user.id,
      userName: user.name,
      badgeNumber: user.badge_number,
      ipAddress: ip,
      userAgent,
      details: { role: user.role, agency: user.agency },
    });

    res.json({
      success: true,
      data: {
        token,
        user: safeUser,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/v1/auth/cac-verify
 * Cryptographic Common Access Card (CAC) / PIV X.509 certificate validation.
 */
authRouter.post(
  '/cac-verify',
  authRateLimiter.middleware(),
  validateBody(cacVerifySchema),
  async (req: Request, res: Response): Promise<void> => {
    const ip = req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // CAC demo maps to Unit Chief Special Agent S. Connor
    const user = mockStore.findUserByEmail('sarah.connor@fbi.gov');
    if (!user) {
      res.status(401).json({
        success: false,
        error: { code: 'CAC_VERIFY_FAILED', message: 'PIV certificate mapping failed.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    user.last_login_at = new Date().toISOString();
    const safeUser = mockStore.toSafeUser(user);
    const token = JwtService.sign(safeUser);

    auditService.log({
      action: 'AUTH_SUCCESS_PIV_CAC',
      userId: user.id,
      userName: user.name,
      badgeNumber: user.badge_number,
      ipAddress: ip,
      userAgent,
      details: { certificate_authority: 'Federal Bridge CA', cert_serial: '0x88914A' },
    });

    res.json({
      success: true,
      data: {
        token,
        user: safeUser,
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/v1/auth/me
 * Retrieves authenticated user session profile.
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response): void => {
  const user = mockStore.findUserByEmail(req.user!.email);
  if (!user) {
    res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User record not found.' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    success: true,
    data: {
      user: mockStore.toSafeUser(user),
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/auth/logout
 * Terminates user session.
 */
authRouter.post('/logout', requireAuth, (req: Request, res: Response): void => {
  auditService.log({
    action: 'USER_LOGOUT',
    userId: req.user!.sub,
    userName: req.user!.name,
    badgeNumber: req.user!.badgeNumber,
    ipAddress: req.socket.remoteAddress,
    details: { reason: 'User initiated signout' },
  });

  res.json({
    success: true,
    data: { message: 'Logged out successfully.' },
    timestamp: new Date().toISOString(),
  });
});
