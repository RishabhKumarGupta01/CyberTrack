/**
 * CryptoTrace Intelligence Platform — Protected Route Guard
 * 
 * Enforces session authentication and role/permission authorization.
 * Falls back to CJIS AccessDenied screen if the user lacks clearance.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AccessDenied } from './AccessDenied';
import { User } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: User['role'] | User['role'][];
  requiredPermission?: string | string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
}) => {
  const { isAuthenticated, isLoading, canAccess } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <span className="text-xs font-mono text-outline uppercase tracking-wider">
          Validating Security Credentials...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  if (!canAccess(requiredRole, requiredPermission)) {
    return <AccessDenied requiredRole={requiredRole} requiredPermission={requiredPermission} />;
  }

  return <>{children}</>;
};
