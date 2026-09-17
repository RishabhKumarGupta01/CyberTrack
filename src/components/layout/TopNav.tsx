import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const TopNav: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();
    if (query.startsWith('0x') || query.startsWith('bc1') || query.length >= 26) {
      navigate(`/wallet/${query}`);
    } else if (query.toUpperCase().startsWith('INV-')) {
      navigate(`/graph/${query.toUpperCase()}`);
    } else {
      navigate(`/vasp/${query.toLowerCase()}`);
    }
  };

  return (
    <header className="bg-surface/90 backdrop-blur-md text-on-surface font-sans h-12 fixed top-0 right-0 left-60 border-b border-outline-variant flex items-center justify-between px-6 z-30 select-none">
      {/* Left: Global Quick Search */}
      <div className="flex-1 max-w-xl">
        <form onSubmit={handleSearch} className="relative group">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant group-focus-within:text-primary transition-colors">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TxID, Address (0x...), Case (INV-...), or VASP..."
            className="w-full bg-surface-dim border border-outline-variant rounded-md py-1.5 pl-9 pr-14 text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs font-mono h-8"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-surface-variant text-[9px] font-mono text-on-surface-variant border border-outline-variant leading-none">
              ⌘
            </span>
            <span className="px-1.5 py-0.5 rounded bg-surface-variant text-[9px] font-mono text-on-surface-variant border border-outline-variant leading-none">
              K
            </span>
          </div>
        </form>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* System Health Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-surface-container border border-outline-variant/60 rounded text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full bg-[#4caf50] animate-pulse"></span>
          <span className="text-outline">Mainnet Nodes:</span>
          <span className="text-on-surface font-medium">SYNCED</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/assistant')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded text-xs font-mono transition-colors"
            title="Open Grounded Investigator AI Assistant"
          >
            <span className="material-symbols-outlined text-[15px]">smart_toy</span>
            <span className="hidden sm:inline font-semibold">AI Copilot</span>
          </button>

          <button
            onClick={() => navigate('/alerts')}
            className="p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-md transition-colors relative"
            title="Notifications & Alerts"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-surface"></span>
          </button>
          
          <button
            onClick={() => navigate('/settings')}
            className="p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-on-surface rounded-md transition-colors"
            title="System Settings"
          >
            <span className="material-symbols-outlined text-[18px]">settings_input_component</span>
          </button>
        </div>

        <div className="w-px h-5 bg-outline-variant"></div>

        {/* User preview */}
        {user && (
          <div className="flex items-center gap-2.5 p-1 pr-2 rounded-md">
            <img
              src={user.avatarUrl}
              alt="Investigator"
              className="w-6 h-6 rounded-md object-cover border border-outline-variant"
            />
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-on-surface leading-none">{user.name}</div>
              <div className="text-[10px] text-outline leading-tight mt-0.5">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
