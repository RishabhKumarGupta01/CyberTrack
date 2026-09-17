import React from 'react';

interface PlaceholderPageProps {
  title: string;
  icon: string;
  description: string;
  breadcrumb?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, icon, description, breadcrumb }) => {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 pb-4 border-b border-outline-variant">
        {breadcrumb && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-sans text-on-surface-variant uppercase tracking-widest">{breadcrumb}</span>
          </div>
        )}
        <h2 className="text-[22px] font-semibold text-on-surface leading-tight tracking-tight flex items-center gap-3">
          <span className="material-symbols-outlined text-outline text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
          {title}
        </h2>
        <p className="text-on-surface-variant text-xs font-sans">{description}</p>
      </div>

      {/* Placeholder Content */}
      <div className="surface-level-1 rounded-md border border-outline-variant p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <span className="material-symbols-outlined text-[48px] text-outline/40" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
        <p className="text-sm text-on-surface-variant text-center max-w-md">
          This module will be fully implemented in Phase 2. The Stitch design has been analyzed and will be faithfully replicated.
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container border border-outline-variant/50 rounded text-[11px] font-mono text-outline">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Module Ready for Implementation
        </div>
      </div>
    </div>
  );
};
