/**
 * CryptoTrace Intelligence Platform — Dual-Mode Authentication & Authorization Context
 * 
 * Supports:
 * 1. Supabase Cloud Auth & PostgreSQL Database synchronization
 * 2. Enterprise JWT Gateway with Role-Based Access Control (RBAC)
 * 3. 1-Click Evaluation Profiles for development and testing
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiClient } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ROLE_PERMISSIONS } from '../types/rbac';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseActive: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>;
  loginWithCac: (certToken?: string, pin?: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  hasRole: (role: User['role'] | User['role'][]) => boolean;
  hasPermission: (permission: string | string[]) => boolean;
  canAccess: (requiredRole?: User['role'] | User['role'][], requiredPermission?: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = sessionStorage.getItem('cryptotrace_user') || localStorage.getItem('cryptotrace_user');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isSupabaseActive = isSupabaseConfigured();

  const loadSupabaseProfile = useCallback(async (authUser: any): Promise<User> => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const role = (profile?.role || authUser.user_metadata?.role || 'L3 Analyst') as User['role'];
      const safeUser: User = {
        id: authUser.id,
        name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Investigator',
        email: authUser.email || '',
        badgeNumber: profile?.badge_number || authUser.user_metadata?.badge_number || 'LEA-4892',
        role,
        agency: profile?.agency || authUser.user_metadata?.agency || 'Financial Crimes Cyber Enforcement (SIH)',
        avatarUrl: profile?.avatar_url || authUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        permissions: ROLE_PERMISSIONS[role] || [],
      };

      setUser(safeUser);
      sessionStorage.setItem('cryptotrace_user', JSON.stringify(safeUser));
      return safeUser;
    } catch {
      const defaultRole = 'L3 Analyst' as User['role'];
      const fallbackUser: User = {
        id: authUser.id,
        name: authUser.email?.split('@')[0] || 'Investigator',
        email: authUser.email || '',
        badgeNumber: 'LEA-4892',
        role: defaultRole,
        agency: 'Financial Crimes Cyber Enforcement (SIH)',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        permissions: ROLE_PERMISSIONS[defaultRole],
      };
      setUser(fallbackUser);
      return fallbackUser;
    }
  }, []);

  const logout = useCallback(() => {
    try {
      if (isSupabaseConfigured()) {
        supabase.auth.signOut().catch(() => {});
      }
      if (apiClient.getToken()) {
        apiClient.post('/api/v1/auth/logout').catch(() => {});
      }
    } finally {
      setUser(null);
      apiClient.setToken(null);
      sessionStorage.removeItem('cryptotrace_user');
      localStorage.removeItem('cryptotrace_user');
    }
  }, []);

  // Validate active session on mount
  useEffect(() => {
    let isMounted = true;

    // Register 401 callback
    apiClient.onUnauthorized(() => {
      if (isMounted) logout();
    });

    const initAuth = async () => {
      // 1. If Supabase is configured, check Supabase session first
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            await loadSupabaseProfile(session.user);
            setIsLoading(false);
            return;
          }
        } catch {
          // Fall through to API check
        }
      }

      // 2. Check local JWT gateway token
      const token = apiClient.getToken();
      if (token) {
        try {
          const res = await apiClient.get<{ user: User }>('/api/v1/auth/me');
          if (isMounted && res.data?.user) {
            setUser(res.data.user);
            sessionStorage.setItem('cryptotrace_user', JSON.stringify(res.data.user));
          }
        } catch {
          if (isMounted) logout();
        }
      }

      if (isMounted) setIsLoading(false);
    };

    initAuth();

    // 3. Listen to Supabase auth state changes if configured
    let subscription: any = null;
    if (isSupabaseConfigured()) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user && isMounted) {
          await loadSupabaseProfile(session.user);
        } else if (!session && !apiClient.getToken() && isMounted) {
          setUser(null);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [logout, loadSupabaseProfile]);

  const login = async (email: string, password: string, remember: boolean = false): Promise<boolean> => {
    let supabaseSuccess = false;

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (!error && data.user) {
          await loadSupabaseProfile(data.user);
          supabaseSuccess = true;
        }
      } catch (err) {
        console.warn('Supabase login notice:', err);
      }
    }

    // 2. Also authenticate with the backend Security Gateway so apiClient holds an active session
    try {
      const res = await apiClient.post<{ token: string; user: User }>('/api/v1/auth/login', {
        email: email.trim(),
        password,
        rememberMe: remember,
      });

      if (res.data?.token && res.data?.user) {
        apiClient.setToken(res.data.token, remember);
        if (!supabaseSuccess) {
          setUser(res.data.user);
        }
        if (remember) {
          localStorage.setItem('cryptotrace_user', JSON.stringify(res.data.user));
        } else {
          sessionStorage.setItem('cryptotrace_user', JSON.stringify(res.data.user));
          localStorage.removeItem('cryptotrace_user');
        }
        return true;
      }
    } catch (apiErr) {
      console.warn('Gateway login notice:', apiErr);
      if (supabaseSuccess) {
        return true;
      }
    }

    return supabaseSuccess;
  };

  const loginWithCac = async (
    certToken = 'PIV-CERT-X509-AUTH',
    pin?: string,
    remember: boolean = false
  ): Promise<boolean> => {
    const res = await apiClient.post<{ token: string; user: User }>('/api/v1/auth/cac-verify', {
      certToken,
      pin,
    });

    if (res.data?.token && res.data?.user) {
      apiClient.setToken(res.data.token, remember);
      setUser(res.data.user);

      if (remember) {
        localStorage.setItem('cryptotrace_user', JSON.stringify(res.data.user));
      } else {
        sessionStorage.setItem('cryptotrace_user', JSON.stringify(res.data.user));
        localStorage.removeItem('cryptotrace_user');
      }
      return true;
    }

    return false;
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      sessionStorage.setItem('cryptotrace_user', JSON.stringify(updated));
      if (localStorage.getItem('cryptotrace_user')) {
        localStorage.setItem('cryptotrace_user', JSON.stringify(updated));
      }
    }
  };

  const hasRole = useCallback(
    (role: User['role'] | User['role'][]): boolean => {
      if (!user) return false;
      const allowed = Array.isArray(role) ? role : [role];
      return allowed.includes(user.role);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission: string | string[]): boolean => {
      if (!user) return false;
      const required = Array.isArray(permission) ? permission : [permission];
      const userPerms = new Set(user.permissions || []);
      return required.every((p) => userPerms.has(p));
    },
    [user]
  );

  const canAccess = useCallback(
    (requiredRole?: User['role'] | User['role'][], requiredPermission?: string | string[]): boolean => {
      if (!user) return false;
      if (requiredRole && !hasRole(requiredRole)) return false;
      if (requiredPermission && !hasPermission(requiredPermission)) return false;
      return true;
    },
    [user, hasRole, hasPermission]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isSupabaseActive,
        login,
        loginWithCac,
        logout,
        updateUser,
        hasRole,
        hasPermission,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
