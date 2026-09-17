/**
 * CryptoTrace Intelligence Platform — NCRP & SAHYOG Type Definitions
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 * Standard: I4C / MHA NCRP Protocol & Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023
 */

export type NcrpComplaintStatus = 
  | 'REGISTERED' 
  | 'UNDER_TRIAGE' 
  | 'ON_CHAIN_TRACED' 
  | 'FREEZE_INITIATED' 
  | 'LIEN_MARKED' 
  | 'ATR_SUBMITTED' 
  | 'CLOSED';

export type NcrpCrimeCategory = 
  | 'Cryptocurrency Investment Scam'
  | 'Task-Based Fraud / Pig Butchering'
  | 'P2P Escrow Fraud'
  | 'Ransomware / Extortion'
  | 'Fake Exchange / Cloud Mining dApp'
  | 'Impersonation / Phishing';

export interface SuspectWalletLead {
  address: string;
  blockchain: 'Ethereum' | 'Bitcoin' | 'Solana' | 'BNB Chain' | 'Tron';
  layer: 'L1 Deposit' | 'L2 Mixing/Bridge' | 'L3 VASP Cashing Out';
  reportedLossUsd: number;
  reportedLossInr: number;
  txHash?: string;
  attributedEntity?: string;
  riskScore: number;
}

export interface BankMuleTrail {
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
  utrNumber: string;
  amountInr: number;
  freezeStatus: 'FREEZE_REQUESTED' | 'FUNDS_FROZEN' | 'LIEN_MARKED' | 'PENDING_BANK';
}

export interface ActionTakenReport {
  atrId: string;
  complaintId: string;
  preparedBy: string;
  badgeNumber: string;
  policeStation: string;
  dateGenerated: string;
  summaryOfInvestigation: string;
  fundTracingPathSummary: string;
  identifiedVasps: string[];
  totalFrozenAmountInr: number;
  totalFrozenAmountUsd: number;
  bsaSection63CertHash: string; // Digital certificate hash under Section 63/65B BSA
  courtNoticeReference?: string;
}

export interface NcrpComplaint {
  id: string;
  acknowledgmentNo: string; // 14-digit NCRP identifier e.g. "20241029001928"
  policeStation: string;
  district: string;
  state: string;
  complainantName: string;
  complainantContact: string; // Masked e.g. "+91 98*** **421"
  incidentDate: string;
  reportedDate: string;
  crimeCategory: NcrpCrimeCategory;
  fraudAmountInr: number;
  fraudAmountUsd: number;
  suspectWallets: SuspectWalletLead[];
  bankTrail: BankMuleTrail[];
  status: NcrpComplaintStatus;
  linkedCaseId?: string | null;
  assignedOfficer?: string;
  officerBadge?: string;
  notes?: string;
  cfcfrmsAlertId?: string; // 1930 Helpline alert ticket
  actionTakenReport?: ActionTakenReport;
  crossIncidentMatches?: number; // Flag for multi-complaint repeat offender wallets
}

export type StatutoryNoticeType = 
  | 'SECTION_94_BNSS' // Summons to produce records, KYC, IP logs, banking links (formerly Sec 91 CrPC)
  | 'SECTION_107_BNSS' // Order for seizure / freezing of digital assets & accounts (formerly Sec 102 CrPC)
  | 'SECTION_111_BNSS' // Organized crime syndicate directive
  | 'FIU_PMLA_COORDINATION'; // Coordination with Financial Intelligence Unit - India

export type SahyogNoticeStatus = 
  | 'DRAFTED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'COMPLIANCE_IN_PROGRESS'
  | 'KYC_RECEIVED'
  | 'ASSETS_FROZEN'
  | 'NON_COMPLIANT'
  | 'CLOSED';

export interface VaspNodalContact {
  vaspId: string;
  entityName: string;
  registeredEntity: string;
  fiuRegistrationNumber: string; // e.g., "FIU-IND/VASP/2023/004"
  jurisdiction: string;
  nodalOfficerName: string;
  nodalEmail: string;
  emergencyContact: string;
  lawEnforcementPortalUrl: string;
  averageSlaHours: number;
  supportedNoticeTypes: StatutoryNoticeType[];
  status: 'ACTIVE' | 'UNDER_SCRUTINY' | 'NON_RESPONSIVE';
}

export interface SahyogNotice {
  id: string;
  noticeNo: string; // e.g., "SAHYOG/LEA/2026/SEC94-0842"
  noticeType: StatutoryNoticeType;
  caseId: string;
  ncrpAckNo?: string;
  targetVaspId: string;
  targetVaspName: string;
  nodalOfficerName: string;
  nodalOfficerEmail: string;
  fiuRegistrationNumber: string;
  issuingAgency: string;
  investigatingOfficerName: string;
  investigatingOfficerBadge: string;
  investigatingOfficerDesignation: string;
  policeStation: string;
  subjectAddresses: string[];
  subjectTxHashes?: string[];
  demandedActions: string[];
  complianceDeadline: string; // ISO date-time
  status: SahyogNoticeStatus;
  createdAt: string;
  updatedAt: string;
  digitalSealHash: string; // Cryptographic SHA-256 integrity seal
  responseSummary?: {
    receivedAt: string;
    kycIdentifiedName?: string;
    registeredMobile?: string;
    registeredEmail?: string;
    bankAccountLinked?: string;
    associatedIpLogs?: string[];
    frozenAmountUsd?: number;
    frozenAmountInr?: number;
    seizureReferenceNo?: string;
    escrowDepositTxHash?: string;
    remarks?: string;
  };
}

export interface SahyogWorkspace {
  id: string;
  operationCode: string; // e.g. "OP-CHAKRA-III", "OP-GARUDA-MULE"
  title: string;
  description: string;
  leadAgency: string;
  participatingAgencies: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'ACTIVE' | 'CONCLUDED' | 'ARCHIVED';
  targetWalletsCount: number;
  totalDefraudedInr: number;
  totalFrozenInr: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntelligenceBulletin {
  id: string;
  bulletinNumber: string;
  title: string;
  authorAgency: string;
  threatCategory: string;
  targetWallets: string[];
  modusOperandi: string;
  publishedAt: string;
  urgency: 'ROUTINE' | 'PRIORITY' | 'URGENT';
}
