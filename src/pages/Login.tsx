import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatApiError } from '../utils/security';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'form' | 'cac'>('form');
  const [cacStep, setCacStep] = useState<'idle' | 'reading' | 'verifying' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isAuthenticated, login, loginWithCac } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to original destination or root if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Investigator Identifier and Security Token are required.');
      return;
    }

    setIsLoading(true);
    setAuthMethod('form');
    try {
      await login(email.trim(), password, rememberMe);
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(formatApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCacAuth = async () => {
    setErrorMessage(null);
    setAuthMethod('cac');
    setCacStep('reading');
    setIsLoading(true);

    setTimeout(() => {
      setCacStep('verifying');
      setTimeout(async () => {
        setCacStep('success');
        setTimeout(async () => {
          try {
            await loginWithCac('PIV-CERT-X509-AUTH', undefined, rememberMe);
            const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
            navigate(from, { replace: true });
          } catch (err) {
            setErrorMessage(formatApiError(err));
          } finally {
            setIsLoading(false);
            setCacStep('idle');
          }
        }, 600);
      }, 700);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 sm:p-6 relative select-none overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-primary-container/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle Forensic Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.06] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#8b919f 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}
      />

      {/* Top Security Gateway Badge */}
      <div className="mb-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container border border-outline-variant/60 shadow-sm relative z-10 animate-fade-in">
        <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
        <span className="text-[11px] font-mono tracking-wider text-outline uppercase">
          SIH Secure Gateway • FIPS 140-3 Validated • TLS 1.3
        </span>
      </div>

      {/* Login Main Container */}
      <div className="w-full max-w-[460px] surface-level-1 border border-outline-variant/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-sm">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-container to-[#00458d] flex items-center justify-center text-white mb-3 shadow-lg shadow-primary-container/25 ring-1 ring-primary/30">
            <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              policy
            </span>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="font-sans text-2xl sm:text-[26px] font-bold text-on-surface tracking-tight">
              CryptoTrace
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-primary/15 text-primary border border-primary/30 tracking-wider">
              Intelligence
            </span>
          </div>
          
          <p className="text-xs text-on-surface-variant mt-2 font-mono">
            Law Enforcement Blockchain Forensics Platform
          </p>
        </div>

        {/* Official Classification Ribbon */}
        <div className="mb-5 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            <span>RESTRICTED ACCESS</span>
          </div>
          <span className="text-outline uppercase tracking-wider">LAW ENFORCEMENT SENSITIVE</span>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/40 text-error text-xs flex items-center gap-2.5 animate-fade-in font-sans">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* CAC / PIV Smart Card Token Modal */}
        {isLoading && authMethod === 'cac' && (
          <div className="mb-5 p-4 rounded-xl bg-surface-container border border-primary/40 space-y-3 text-center animate-fade-in">
            <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px] animate-spin">sync</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-primary">
                {cacStep === 'reading' && 'Reading Smart Card Hardware Chip...'}
                {cacStep === 'verifying' && 'Validating Federal PIV Certificate...'}
                {cacStep === 'success' && 'PIV-ID Verified: Special Agent S. Connor (FBI-CYBER-09)'}
              </div>
              <p className="text-[11px] text-outline font-mono">Cryptographic handshake in progress...</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-sans font-semibold text-on-surface-variant uppercase tracking-wider block">
              Investigator Identifier / Official Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                badge
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full input-field rounded-lg px-3 py-2.5 pl-10 text-xs font-mono text-on-surface focus:ring-1 focus:ring-primary placeholder:text-outline/50"
                placeholder="analyst@agency.gov"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-sans font-semibold text-on-surface-variant uppercase tracking-wider block">
                Security Token / Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-mono text-outline hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full input-field rounded-lg px-3 py-2.5 pl-10 pr-10 text-xs font-mono text-on-surface focus:ring-1 focus:ring-primary placeholder:text-outline/50"
                placeholder="Enter password or select 1-click role"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-outline pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-surface-container border border-outline-variant text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer" 
              />
              <span className="text-on-surface-variant text-[11px]">Remember workstation</span>
            </label>
            <button
              type="button"
              onClick={handleCacAuth}
              disabled={isLoading}
              className="text-primary hover:text-primary-fixed hover:underline text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">credit_card</span>
              <span>CAC / PIV Card</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary font-semibold py-2.5 rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading && authMethod === 'form' ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                <span>Access Command Center</span>
              </>
            )}
          </button>
        </form>

        {/* Security Warning Notice */}
        <div className="mt-5 p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40 text-[10px] text-outline text-center font-mono leading-relaxed">
          <span>WARNING: UNLAWFUL ACCESS PROHIBITED UNDER 18 U.S.C. § 1030</span>
          <div className="text-[9px] text-outline/70 mt-0.5">All transactions and forensic queries are audited & logged.</div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-6 text-center text-[11px] text-outline/60 font-mono relative z-10 flex items-center gap-4">
        <span>CryptoTrace SIH v2.4.0</span>
        <span>•</span>
        <span>Node: synced (Block #20,891,440)</span>
        <span>•</span>
        <span className="text-[#22c55e]">Operations Normal</span>
      </footer>
    </div>
  );
};
