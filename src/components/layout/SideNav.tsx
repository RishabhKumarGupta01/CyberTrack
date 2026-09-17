import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: number | string;
}

export const SideNav: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { name: 'Command Center', path: '/', icon: 'dashboard' },
    { name: 'Investigator AI', path: '/assistant', icon: 'smart_toy', badge: 'AI' },
    { name: 'New Investigation', path: '/investigations/new', icon: 'troubleshoot' },
    { name: 'Wallet Intelligence', path: '/wallet', icon: 'account_balance_wallet' },
    { name: 'Transaction Graph', path: '/graph', icon: 'account_tree' },
    { name: 'VASP Intelligence', path: '/vasp', icon: 'business_center' },
    { name: 'NCRP & SAHYOG', path: '/ncrp-sahyog', icon: 'hub', badge: 'LEA' },
    { name: 'Risk Analysis', path: '/risk', icon: 'shield' },
    { name: 'Real-Time Monitoring', path: '/monitoring', icon: 'monitor_heart' },
    { name: 'Alerts', path: '/alerts', icon: 'notifications_active' },
    { name: 'Reports', path: '/reports', icon: 'description' },
    { name: 'Evidence & Audit', path: '/evidence', icon: 'folder_shared' },
  ];

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-surface-dim font-sans text-sm w-60 h-screen fixed left-0 top-0 border-r border-outline-variant flex flex-col gap-1 p-3 z-40 select-none">
      {/* Brand Header */}
      <div 
        className="flex items-center gap-2.5 mb-5 px-2 mt-1 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary-container shrink-0 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            policy
          </span>
        </div>
        <div>
          <h1 className="text-sm font-bold text-on-surface tracking-tight leading-tight flex items-center">
            CryptoTrace
          </h1>
          <p className="text-[10px] text-primary font-mono tracking-widest uppercase leading-tight mt-0.5 opacity-90">
            Intelligence
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
        <div className="text-[10px] font-sans text-outline uppercase tracking-wider mb-2 px-3">
          Investigation Modules
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-md transition-all text-xs font-medium ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm border border-outline-variant/60'
                  : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <span
                className="material-symbols-outlined text-[18px] text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {item.icon}
              </span>
              <span>{item.name}</span>
            </div>
            {item.badge !== undefined && (
              <span className="bg-error-container text-error text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-error/30">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer Navigation: Settings & Profile */}
      <div className="pt-2 mt-auto border-t border-outline-variant flex flex-col gap-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-xs font-medium ${
              isActive
                ? 'bg-secondary-container text-on-secondary-container'
                : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
          <span>Settings</span>
        </NavLink>

        {/* User Card */}
        {user ? (
          <div className="mt-2 p-2 rounded-md bg-surface-container-low border border-outline-variant/50 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-md object-cover border border-outline-variant shrink-0"
              />
              <div className="truncate">
                <div className="text-xs font-semibold text-on-surface leading-none truncate">
                  {user.name}
                </div>
                <div className="text-[10px] text-outline leading-tight mt-0.5 font-mono">
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-surface-variant cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full btn-primary py-1.5 rounded text-xs mt-1"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};
