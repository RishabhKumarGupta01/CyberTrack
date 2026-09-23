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
    <nav className="font-sans text-sm w-[240px] h-full flex flex-col gap-2 py-2 select-none shrink-0 z-40 transition-all duration-300 overflow-hidden">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-5 px-2 mt-1">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
              alt="Emblem of India"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-sm font-bold text-on-surface tracking-tight leading-tight flex items-center uppercase">
              Gov of India
            </h1>
            <p className="text-[11px] text-primary font-bold tracking-wide leading-tight mt-0.5 opacity-90">
              CryptoTrace
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 overflow-x-hidden">
        <div className="text-xs font-sans text-on-surface-variant font-semibold mb-2 px-3 pt-4 whitespace-nowrap">
          Investigation Modules
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg transition-all text-[13px] font-medium ${
                isActive
                  ? 'bg-primary-container/50 text-on-primary-container shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant/80 hover:text-on-surface'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <span
                className="material-symbols-outlined text-[18px] text-current shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {item.icon}
              </span>
              <span className="whitespace-nowrap">{item.name}</span>
            </div>
            {item.badge !== undefined && (
              <span className="bg-error-container text-error text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-error/30 shrink-0">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer Navigation: Settings & Profile */}
      <div className="pt-2 mt-auto border-t border-outline-variant flex flex-col gap-1 overflow-x-hidden">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-[13px] font-medium ${
              isActive
                ? 'bg-primary-container/50 text-on-primary-container shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-variant/80 hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[18px] shrink-0">settings</span>
          <span className="whitespace-nowrap">Settings</span>
        </NavLink>

        {/* User Card */}
        {user ? (
          <div className="mt-2 p-2 rounded-md bg-surface-container-low border border-outline-variant/50 flex items-center justify-between whitespace-nowrap">
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
                <div className="text-[11px] text-on-surface-variant leading-tight mt-0.5 font-medium truncate">
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-surface-variant cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="w-full btn-primary py-1.5 rounded text-xs mt-1"
            title="Sign In"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};
