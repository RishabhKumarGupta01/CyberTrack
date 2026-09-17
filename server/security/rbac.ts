/**
 * CryptoTrace Intelligence — Role-Based Access Control (RBAC) Engine
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 */

import { Request, Response, NextFunction } from 'express';
import { JwtService } from './jwt';
import { AuthTokenPayload, Permission, UserRole } from '../types/security';

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'Admin': 50,
  'Lead Investigator': 40,
  'L3 Analyst': 30,
  'L2 Analyst': 20,
  'L1 Analyst': 10,
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'Admin': [
    'cases:read', 'cases:create', 'cases:update', 'cases:delete', 'cases:close',
    'evidence:read', 'evidence:seal', 'evidence:verify', 'evidence:subpoena',
    'reports:read', 'reports:create', 'reports:approve', 'reports:export',
    'settings:read', 'settings:manage',
    'audit:read', 'audit:verify',
    'users:manage',
    'ncrp:read', 'ncrp:create', 'ncrp:action',
    'sahyog:read', 'sahyog:create', 'sahyog:notice',
  ],
  'Lead Investigator': [
    'cases:read', 'cases:create', 'cases:update', 'cases:close',
    'evidence:read', 'evidence:seal', 'evidence:verify', 'evidence:subpoena',
    'reports:read', 'reports:create', 'reports:approve', 'reports:export',
    'audit:read', 'audit:verify',
    'settings:read',
    'ncrp:read', 'ncrp:create', 'ncrp:action',
    'sahyog:read', 'sahyog:create', 'sahyog:notice',
  ],
  'L3 Analyst': [
    'cases:read', 'cases:create', 'cases:update',
    'evidence:read', 'evidence:seal', 'evidence:verify',
    'reports:read', 'reports:create', 'reports:export',
    'audit:read', 'audit:verify',
    'settings:read',
    'ncrp:read', 'ncrp:create', 'ncrp:action',
    'sahyog:read', 'sahyog:create', 'sahyog:notice',
  ],
  'L2 Analyst': [
    'cases:read', 'cases:update',
    'evidence:read',
    'reports:read',
    'audit:read',
    'ncrp:read', 'ncrp:create',
    'sahyog:read', 'sahyog:create',
  ],
  'L1 Analyst': [
    'cases:read',
    'evidence:read',
    'reports:read',
    'ncrp:read',
    'sahyog:read',
  ],
};

/**
 * Middleware: Requires a valid Bearer JWT. Rejects with 401 Unauthorized if missing/invalid.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required to access this classified resource.',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const payload = JwtService.verify(token);

  if (!payload) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Your session token is expired, tampered, or invalid. Please re-authenticate.',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  req.user = payload;
  next();
};

/**
 * Middleware: Requires a specific role or set of roles. Rejects with 403 Forbidden.
 */
export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  const roleList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!roleList.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires role: [${roleList.join(', ')}]. Current clearance: ${req.user.role}.`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};

/**
 * Middleware: Requires specific granular permission(s). Rejects with 403 Forbidden.
 */
export const requirePermission = (required: Permission | Permission[]) => {
  const requiredList = Array.isArray(required) ? required : [required];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userPermissions = new Set(req.user.permissions || []);
    const hasAll = requiredList.every((perm) => userPermissions.has(perm));

    if (!hasAll) {
      const missing = requiredList.filter((perm) => !userPermissions.has(perm));
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Missing statutory permissions: [${missing.join(', ')}].`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
};
