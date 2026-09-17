/**
 * CryptoTrace Intelligence Platform — Shared Role-Based Access Control (RBAC) Types & Constants
 * 
 * Safe for client-side and browser execution (Zero Node.js dependencies).
 */

export type UserRole = 'L1 Analyst' | 'L2 Analyst' | 'L3 Analyst' | 'Lead Investigator' | 'Admin';

export type Permission =
  // Case permissions
  | 'cases:read'
  | 'cases:create'
  | 'cases:update'
  | 'cases:delete'
  | 'cases:close'
  // Evidence permissions
  | 'evidence:read'
  | 'evidence:seal'
  | 'evidence:verify'
  | 'evidence:subpoena'
  // Report permissions
  | 'reports:read'
  | 'reports:create'
  | 'reports:approve'
  | 'reports:export'
  // System / admin permissions
  | 'settings:read'
  | 'settings:manage'
  | 'audit:read'
  | 'audit:verify'
  | 'users:manage';

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
  ],
  'Lead Investigator': [
    'cases:read', 'cases:create', 'cases:update', 'cases:close',
    'evidence:read', 'evidence:seal', 'evidence:verify', 'evidence:subpoena',
    'reports:read', 'reports:create', 'reports:approve', 'reports:export',
    'audit:read', 'audit:verify',
    'settings:read',
  ],
  'L3 Analyst': [
    'cases:read', 'cases:create', 'cases:update',
    'evidence:read', 'evidence:seal', 'evidence:verify',
    'reports:read', 'reports:create', 'reports:export',
    'audit:read', 'audit:verify',
    'settings:read',
  ],
  'L2 Analyst': [
    'cases:read', 'cases:update',
    'evidence:read',
    'reports:read',
    'audit:read',
  ],
  'L1 Analyst': [
    'cases:read',
    'evidence:read',
    'reports:read',
  ],
};
