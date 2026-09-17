import React from 'react';
import { Outlet } from 'react-router-dom';
import { SideNav } from './SideNav';
import { TopNav } from './TopNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex bg-background h-screen w-screen overflow-hidden text-on-surface">
      {/* Fixed Side Navigation */}
      <SideNav />

      {/* Main Workspace Wrapper */}
      <div className="ml-60 flex-1 flex flex-col h-screen bg-background relative overflow-hidden">
        {/* Fixed Top Bar */}
        <TopNav />

        {/* Scrollable Content Canvas */}
        <main className="flex-1 mt-12 overflow-y-auto bg-background p-6 pb-20">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
