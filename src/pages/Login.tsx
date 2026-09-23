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
      setErrorMessage('Nodal Officer ID and Password are required.');
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
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center select-none overflow-hidden relative">
      {/* Indian Tricolor Header Strip */}
      <div className="absolute top-0 left-0 right-0 h-2 w-full flex flex-col z-50">
        <div className="flex-1 bg-secondary"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-tertiary"></div>
      </div>

      {/* Subtle Watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[1] z-0"
        style={{
          backgroundImage: 'url("/bg-monuments.jpg")',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover'
        }}
      />

      {/* Login Portal */}
      <div className="w-full max-w-[420px] relative z-10 bg-surface/95 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-2xl border border-outline-variant">

        {/* Top Security Gateway Badge */}
        <div className="mb-8 flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container border border-outline-variant/60 shadow-sm animate-fade-in mx-auto w-max">
          <span className="w-2 h-2 rounded-full bg-[#138808] animate-pulse"></span>
          <span className="text-[11px] font-sans font-medium tracking-wider text-outline uppercase">
            NIC Secure Gateway • e-Pramaan • TLS 1.3
          </span>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
            alt="State Emblem of India"
            className="h-20 mb-4 opacity-90"
          />
          <h1 className="font-sans text-xl sm:text-2xl font-bold text-on-surface tracking-tight uppercase">
            CryptoTrace Portal
          </h1>
          <h2 className="text-sm font-bold text-primary mt-1 uppercase tracking-widest">
            Authorized Access Only
          </h2>
          <p className="text-xs text-on-surface-variant mt-2 font-medium">
            Nodal Officers & Law Enforcement Agencies
          </p>
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
            <div className="w-10 h-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px] animate-spin">sync</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-primary">
                {cacStep === 'reading' && 'Reading e-Pramaan Token...'}
                {cacStep === 'verifying' && 'Validating NIC Certificate...'}
                {cacStep === 'success' && 'Token Verified: Nodal Officer (I4C-HQ-01)'}
              </div>
              <p className="text-[11px] text-outline font-mono">Cryptographic handshake in progress...</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-sans font-semibold text-on-surface-variant uppercase tracking-wider block">
              Gov.in Email / Nodal ID
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
                className="w-full input-field rounded-lg px-3 py-2.5 pl-10 text-xs font-mono text-on-surface focus:ring-1 focus:ring-primary placeholder:text-outline/50 bg-background"
                placeholder="officer@nic.in"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-sans font-semibold text-on-surface-variant uppercase tracking-wider block">
                Portal Password
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
                className="w-full input-field rounded-lg px-3 py-2.5 pl-10 pr-10 text-xs font-mono text-on-surface focus:ring-1 focus:ring-primary placeholder:text-outline/50 bg-background"
                placeholder="Enter secure password"
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
              <span className="text-on-surface-variant text-[11px]">Remember terminal</span>
            </label>
            <button
              type="button"
              onClick={handleCacAuth}
              disabled={isLoading}
              className="text-primary hover:text-primary-fixed hover:underline text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">credit_card</span>
              <span>Login with e-Pramaan Token</span>
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
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                <span>Secure Login</span>
              </>
            )}
          </button>
        </form>

        {/* Security Warning Notice */}
        <div className="mt-8 p-3 rounded-lg bg-surface-container border border-outline-variant/40 text-[10px] text-on-surface-variant text-center leading-relaxed">
          <span className="font-bold text-error">WARNING:</span> UNLAWFUL ACCESS PROHIBITED.
          <div className="text-[9px] text-outline mt-1 font-mono">
            All transactions and forensic queries are audited by NIC.
          </div>
        </div>

        <footer className="mt-6 text-center text-[10px] text-outline font-mono">
          <span>© 2024 Government of India. All rights reserved.</span>
        </footer>
      </div>
    </div>
  );
};
