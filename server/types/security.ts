/**
 * CryptoTrace Intelligence Platform — Server Security Type Definitions
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
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
  | 'users:manage'
  // NCRP platform permissions
  | 'ncrp:read'
  | 'ncrp:create'
  | 'ncrp:action'
  // SAHYOG platform permissions
  | 'sahyog:read'
  | 'sahyog:create'
  | 'sahyog:notice';

export interface AuthTokenPayload {
  sub: string; // User ID
  email: string;
  name: string;
  badgeNumber: string;
  role: UserRole;
  agency: string;
  permissions: Permission[];
  iat: number;
  exp: number;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  badgeNumber: string;
  role: UserRole;
  agency: string;
  avatarUrl?: string | null;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface AuditRecord {
  id: string;
  action: string;
  user_id?: string | null;
  user_name?: string | null;
  user_badge_number: string;
  user_ip_address?: string | null;
  user_agent?: string | null;
  case_id?: string | null;
  wallet_address?: string | null;
  tx_hash?: string | null;
  details?: Record<string, unknown>;
  artifact_hash?: string | null;
  prev_log_hash?: string | null;
  tamper_status: 'VERIFIED' | 'FLAGGED' | 'AUDITED';
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
