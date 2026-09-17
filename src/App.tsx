import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Login } from './pages/Login';
import { CommandCenter } from './pages/CommandCenter';
import { NewInvestigation } from './pages/NewInvestigation';
import { WalletIntelligence } from './pages/WalletIntelligence';
import { TransactionGraph } from './pages/TransactionGraph';
import { VaspIntelligence } from './pages/VaspIntelligence';
import { RiskAnalysis } from './pages/RiskAnalysis';
import { RealTimeMonitoring } from './pages/RealTimeMonitoring';
import { AlertCenter } from './pages/AlertCenter';
import { InvestigationReport } from './pages/InvestigationReport';
import { EvidenceAuditTrail } from './pages/EvidenceAuditTrail';
import { Settings } from './pages/Settings';
import { InvestigatorAssistant } from './pages/InvestigatorAssistant';
import { NcrpSahyogHub } from './pages/NcrpSahyogHub';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes — All wrapped in AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CommandCenter />} />
          <Route path="/assistant" element={<InvestigatorAssistant />} />

          {/* New Case Creation — Requires cases:create permission */}
          <Route
            path="/investigations/new"
            element={
              <ProtectedRoute requiredPermission="cases:create">
                <NewInvestigation />
              </ProtectedRoute>
            }
          />

          <Route path="/wallet" element={<WalletIntelligence />} />
          <Route path="/wallet/:address" element={<WalletIntelligence />} />
          <Route path="/graph" element={<TransactionGraph />} />
          <Route path="/graph/:caseId" element={<TransactionGraph />} />
          <Route path="/vasp" element={<VaspIntelligence />} />
          <Route path="/vasp/:entityId" element={<VaspIntelligence />} />
          <Route path="/ncrp-sahyog" element={<NcrpSahyogHub />} />
          <Route path="/risk" element={<RiskAnalysis />} />
          <Route path="/risk/:walletId" element={<RiskAnalysis />} />
          <Route path="/monitoring" element={<RealTimeMonitoring />} />
          <Route path="/alerts" element={<AlertCenter />} />

          {/* Reports — Requires reports:read permission */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <InvestigationReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/:caseId"
            element={
              <ProtectedRoute requiredPermission="reports:read">
                <InvestigationReport />
              </ProtectedRoute>
            }
          />

          {/* Evidence Vault — Requires evidence:read permission */}
          <Route
            path="/evidence"
            element={
              <ProtectedRoute requiredPermission="evidence:read">
                <EvidenceAuditTrail />
              </ProtectedRoute>
            }
          />

          {/* System Settings — Strictly restricted to Admin role */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole="Admin">
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Catch-all — redirect to Command Center */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
};
