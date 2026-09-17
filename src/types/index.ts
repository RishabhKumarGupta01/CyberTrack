export interface User {
  id: string;
  name: string;
  email: string;
  badgeNumber: string;
  role: 'L1 Analyst' | 'L2 Analyst' | 'L3 Analyst' | 'Lead Investigator' | 'Admin';
  agency: string;
  avatarUrl: string;
  permissions?: string[];
}

export interface Case {
  id: string;
  caseId: string; // e.g. "INV-2023-0842"
  title: string;
  status: 'active' | 'in_review' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  fraudType: 'pig_butchering' | 'phishing' | 'ransomware' | 'hacks' | 'other';
  reportedAmountUsd: number;
  targetAddress: string;
  network: 'ETH' | 'BTC' | 'SOL' | 'BSC';
  victimRef?: string;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  address: string;
  blockchain: 'Ethereum' | 'Bitcoin' | 'Solana' | 'BNB Chain';
  balance: string;
  balanceUsd: number;
  totalTxs: number;
  uniquePeers: number;
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  firstActive: string;
  lastActive: string;
  ens?: string;
  isMonitored: boolean;
  tags: string[];
}

export interface Alert {
  id: string;
  type: 'NEW_TRANSACTION' | 'HIGH_VALUE_TRANSFER' | 'RAPID_FORWARDING' | 'LAYERING_DETECTED' | 'MIXER_EXPOSURE' | 'EXCHANGE_DEPOSIT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  walletAddress: string;
  caseId: string;
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  amountUsd?: number;
}

export interface VaspEntity {
  id: string;
  name: string;
  entityType: 'Centralized Exchange' | 'DEX' | 'Mixer' | 'Bridge' | 'High-Risk Entity';
  jurisdiction: string;
  kycLevel: 'Full' | 'Partial/Tiered' | 'None' | 'Unknown';
  attributionConfidence: number; // 0 - 100%
  behavioralRiskScore: number; // 0 - 100
  probableVasp: boolean;
  knownAddressesCount: number;
  subjectAddress: string;
}

// Re-export all detailed database entity models
export * from './database';
