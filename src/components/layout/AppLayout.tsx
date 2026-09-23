import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopNav } from './TopNav';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-container text-on-surface">
      {/* Indian Tricolor Header Strip */}
      <div className="h-2 w-full flex flex-col shrink-0">
        <div className="flex-1 bg-secondary"></div>
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-tertiary"></div>
      </div>

      <div className="flex flex-1 p-4 gap-4 overflow-hidden">
        {/* Floating Side Navigation */}
        {isSidebarOpen && <SideNav />}

        {/* Main Workspace Wrapper */}
        <div className="flex-1 flex flex-col h-full bg-background rounded-2xl relative overflow-hidden shadow-sm border border-outline-variant/50">
          {/* Top Navigation */}
          <TopNav onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

          {/* Scrollable Content Canvas */}
          <main className="flex-1 overflow-y-auto relative p-6 lg:p-8 pb-20">
            {/* Official Emblem Watermark */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.25] z-0"
              style={{
                backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg")',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'auto 80%',
                backgroundAttachment: 'fixed'
              }}
            />

            <div className="relative z-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
