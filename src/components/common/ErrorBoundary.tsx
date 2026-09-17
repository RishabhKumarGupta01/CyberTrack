/**
 * CryptoTrace Intelligence Platform — High-Reliability Security Error Boundary
 * 
 * Intercepts UI render crashes safely. Prevents exposure of component stacks
 * or internal state details to unauthorized observers.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  incidentId: string | null;
  errorMessage?: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    incidentId: null,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    return { hasError: true, incidentId, errorMessage: error?.message || 'Unknown runtime anomaly' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error internally for audit review
    console.error(`[SECURITY ERROR BOUNDARY] Incident: ${this.state.incidentId}`, error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({ hasError: false, incidentId: null, errorMessage: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-6 text-on-surface select-none">
          <div className="max-w-lg w-full surface-level-1 border border-error/50 rounded-xl p-8 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-error-container/20 border border-error/40 flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[32px]">shield_lock</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-error uppercase tracking-widest bg-error/10 px-2 py-0.5 rounded border border-error/20">
                Security Incident Contained
              </span>
              <h2 className="text-xl font-bold tracking-tight text-on-surface">
                Forensic Subsystem Exception Prevented
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                An isolated client-side execution anomaly was halted to safeguard investigative data integrity.
              </p>
            </div>

            <div className="p-3 bg-surface-container-lowest border border-outline-variant/60 rounded-lg text-left font-mono text-xs space-y-1">
              <div className="text-outline text-[11px]">INCIDENT REFERENCE</div>
              <div className="text-primary font-bold">{this.state.incidentId}</div>
              <div className="text-[10px] text-outline/80 mt-1">
                Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
              </div>
              {this.state.errorMessage && (
                <div className="text-[11px] text-error/90 pt-1 border-t border-outline-variant/30 mt-1 break-words">
                  Diagnostics: {this.state.errorMessage}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="flex-1 btn-secondary py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Retry Module
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 btn-primary py-2 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                Reset Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
