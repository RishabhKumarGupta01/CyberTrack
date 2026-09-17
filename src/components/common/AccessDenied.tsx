/**
 * CryptoTrace Intelligence Platform — Restricted Access Notification Component
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AccessDeniedProps {
  requiredRole?: string | string[];
  requiredPermission?: string | string[];
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requiredRole, requiredPermission }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const roleText = Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole;
  const permText = Array.isArray(requiredPermission) ? requiredPermission.join(', ') : requiredPermission;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-on-surface select-none">
      <div className="max-w-md w-full surface-level-1 border border-outline-variant/80 rounded-xl p-8 shadow-2xl space-y-5 text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-error rounded-full"></div>

        <div className="w-14 h-14 mx-auto rounded-full bg-error-container/20 border border-error/40 flex items-center justify-center text-error">
          <span className="material-symbols-outlined text-[32px]">lock_clock</span>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-error uppercase tracking-widest bg-error/10 px-2 py-0.5 rounded border border-error/20 inline-block">
            RESTRICTED FORENSIC ACCESS
          </div>
          <h2 className="text-xl font-bold tracking-tight text-on-surface">
            Classification Clearance Required
          </h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Your current operational credentials do not possess the statutory authorization required to access this module.
          </p>
        </div>

        {/* Security Clearance Details Card */}
        <div className="p-3.5 bg-surface-container-lowest border border-outline-variant/60 rounded-lg text-left font-mono text-xs space-y-2">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-outline">Active Clearance:</span>
            <span className="text-on-surface font-semibold">{user?.role || 'Unassigned'}</span>
          </div>

          {roleText && (
            <div className="flex justify-between items-center text-[11px] border-t border-outline-variant/40 pt-1.5">
              <span className="text-outline">Required Role:</span>
              <span className="text-primary font-semibold">{roleText}</span>
            </div>
          )}

          {permText && (
            <div className="flex justify-between items-center text-[11px] border-t border-outline-variant/40 pt-1.5">
              <span className="text-outline">Required Permission:</span>
              <span className="text-primary font-semibold truncate max-w-[180px]">{permText}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-[11px] border-t border-outline-variant/40 pt-1.5">
            <span className="text-outline">Audited Badge:</span>
            <span className="text-outline">{user?.badgeNumber || 'N/A'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate('/')}
            className="flex-1 btn-primary py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Command Center
          </button>
          <button
            onClick={() => navigate('/login')}
            className="btn-secondary px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider"
          >
            Switch Profile
          </button>
        </div>

        <div className="text-[10px] text-outline font-mono pt-1">
          18 U.S.C. § 1030 • All access attempts are cryptographically journaled.
        </div>
      </div>
    </div>
  );
};
