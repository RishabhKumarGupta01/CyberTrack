/**
 * CryptoTrace Intelligence Platform — NCRP & SAHYOG Frontend Types
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
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
  bsaSection63CertHash: string;
  courtNoticeReference?: string;
}

export interface NcrpComplaint {
  id: string;
  acknowledgmentNo: string;
  policeStation: string;
  district: string;
  state: string;
  complainantName: string;
  complainantContact: string;
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
  cfcfrmsAlertId?: string;
  actionTakenReport?: ActionTakenReport;
  crossIncidentMatches?: number;
}

export type StatutoryNoticeType = 
  | 'SECTION_94_BNSS'
  | 'SECTION_107_BNSS'
  | 'SECTION_111_BNSS'
  | 'FIU_PMLA_COORDINATION';

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
  fiuRegistrationNumber: string;
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
  noticeNo: string;
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
  complianceDeadline: string;
  status: SahyogNoticeStatus;
  createdAt: string;
  updatedAt: string;
  digitalSealHash: string;
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
  operationCode: string;
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
