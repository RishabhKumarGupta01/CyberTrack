import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface TopNavProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar, isSidebarOpen }) => {
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
    <header className="bg-transparent text-on-surface font-sans h-16 flex items-center justify-between px-6 shrink-0 z-30 select-none gap-4">
      {/* Left: Global Quick Search & Menu */}
      <div className="flex-1 max-w-xl flex items-center gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md hover:bg-surface-variant text-on-surface-variant transition-colors"
            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        )}
        <form onSubmit={handleSearch} className="relative group w-full">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant group-focus-within:text-primary transition-colors">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TxID, Address, Case, or VASP..."
            className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-full py-2 pl-10 pr-14 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm h-10 shadow-sm"
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/assistant')}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-container text-on-primary-container rounded-full text-sm font-semibold transition-colors hover:bg-primary-container/80 shadow-sm"
            title="Open Grounded Investigator AI Assistant"
          >
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            <span className="hidden sm:inline">AI Copilot</span>
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
            <div className="text-left hidden lg:block ml-1">
              <div className="text-sm font-semibold text-on-surface leading-none">{user.name}</div>
              <div className="text-xs text-on-surface-variant leading-tight mt-1">{user.role}</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
