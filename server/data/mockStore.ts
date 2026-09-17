/**
 * CryptoTrace Intelligence Platform — In-Memory Backing Store
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 * 
 * SECURITY DIRECTIVE:
 * password_hash is strictly isolated to this module and NEVER returned in client responses.
 */

import bcrypt from 'bcryptjs';
import { SafeUser, UserRole } from '../types/security';
import { ROLE_PERMISSIONS } from '../security/rbac';
import {
  NcrpComplaint,
  SahyogNotice,
  VaspNodalContact,
  SahyogWorkspace,
  IntelligenceBulletin,
} from '../types/ncrpSahyog';

export interface InternalDbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  badge_number: string;
  role: UserRole;
  agency: string;
  avatar_url?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
}

export interface InternalDbCase {
  id: string;
  case_id: string;
  title: string;
  description?: string;
  status: 'active' | 'in_review' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  fraud_type: string;
  reported_amount_usd: number;
  target_address: string;
  network: string;
  victim_ref?: string;
  notes?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InternalDbEvidence {
  id: string;
  evidence_number: string;
  case_id: string;
  title: string;
  description?: string;
  evidence_type: string;
  file_name: string;
  file_size_bytes: number;
  sha256_hash: string;
  hmac_signature?: string;
  chain_of_custody_status: 'SEALED' | 'IN_REVIEW' | 'COURT_SUBMITTED' | 'ARCHIVED';
  subpoena_hold_active: boolean;
  collected_by: string;
  verified_by?: string;
  collected_at: string;
}

// Pre-compute bcrypt hash for standard evaluation password: "GovSec#Trace2026"
const EVAL_PASSWORD_HASH = bcrypt.hashSync('GovSec#Trace2026', 10);

export class MockStore {
  private static instance: MockStore;

  public users: Map<string, InternalDbUser> = new Map();
  public cases: Map<string, InternalDbCase> = new Map();
  public evidence: Map<string, InternalDbEvidence> = new Map();
  public ncrpComplaints: Map<string, NcrpComplaint> = new Map();
  public sahyogNotices: Map<string, SahyogNotice> = new Map();
  public vaspNodalDirectory: Map<string, VaspNodalContact> = new Map();
  public sahyogWorkspaces: Map<string, SahyogWorkspace> = new Map();
  public intelligenceBulletins: Map<string, IntelligenceBulletin> = new Map();
  public systemSettings: {
    ethRpcUrl: string;
    btcRpcUrl: string;
    solanaRpcUrl: string;
    aiAssistantEnabled: boolean;
    fips140Mode: boolean;
    updatedAt: string;
  };

  private constructor() {
    this.seedUsers();
    this.seedCases();
    this.seedEvidence();
    this.seedNcrpComplaints();
    this.seedVaspNodalDirectory();
    this.seedSahyogNotices();
    this.seedSahyogWorkspaces();
    this.systemSettings = {
      ethRpcUrl: 'https://cloudflare-eth.com',
      btcRpcUrl: 'https://mempool.space/api',
      solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
      aiAssistantEnabled: true,
      fips140Mode: true,
      updatedAt: new Date().toISOString(),
    };
  }

  public static getInstance(): MockStore {
    if (!MockStore.instance) {
      MockStore.instance = new MockStore();
    }
    return MockStore.instance;
  }

  private seedUsers(): void {
    const defaultUsers: InternalDbUser[] = [
      {
        id: 'a1000000-0000-0000-0000-000000000001',
        name: 'I. Kerman',
        email: 'i.kerman@cryptotrace.gov',
        password_hash: EVAL_PASSWORD_HASH,
        badge_number: 'LEA-4892',
        role: 'L3 Analyst',
        agency: 'Financial Crimes Cyber Enforcement (SIH)',
        avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUEplg9nVh4fxaQNnrgUdLQd9r5Sn_d92v-XZOoqT7kHBIJFJRJgetacqctCMv3xC12A2Nw3QS9v-1XGaCQxq6j0fPx0cd4f1VLpO_McpunBBBejohj48wtwNT9glzDjeHcozpOfsFVM6HyRIlQcI2Rp5kQ1j8SNVYsKHYFWSE2RP3LzC-HiwNHdYDBtAgQCW51sdJfoJZ6YDp2pnlokZKnAhlle7yH5CxdvDtubgLf96yy9i26eOc',
        is_active: true,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000002',
        name: 'S. Connor',
        email: 'sarah.connor@fbi.gov',
        password_hash: EVAL_PASSWORD_HASH,
        badge_number: 'FBI-CYBER-09',
        role: 'Lead Investigator',
        agency: 'Federal Bureau of Investigation — Cyber Task Force',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        is_active: true,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000003',
        name: 'M. Vance',
        email: 'm.vance@usss.treas.gov',
        password_hash: EVAL_PASSWORD_HASH,
        badge_number: 'USSS-DATF-77',
        role: 'Lead Investigator',
        agency: 'US Secret Service — Digital Assets Task Force',
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        is_active: true,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000004',
        name: 'Admin Chief S. Ross',
        email: 'admin@cryptotrace.gov',
        password_hash: EVAL_PASSWORD_HASH,
        badge_number: 'SEC-ADMIN-01',
        role: 'Admin',
        agency: 'National Cybersecurity & Forensics Directorate',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        is_active: true,
      },
      {
        id: 'a1000000-0000-0000-0000-000000000005',
        name: 'T. Reyes (Junior Triage)',
        email: 't.reyes@cryptotrace.gov',
        password_hash: EVAL_PASSWORD_HASH,
        badge_number: 'LEA-1044',
        role: 'L1 Analyst',
        agency: 'Financial Crimes Cyber Enforcement (SIH)',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        is_active: true,
      },
    ];

    for (const u of defaultUsers) {
      this.users.set(u.email.toLowerCase(), u);
    }
  }

  private seedCases(): void {
    const cases: InternalDbCase[] = [
      {
        id: 'c2000000-0000-0000-0000-000000000001',
        case_id: 'INV-2023-0842',
        title: 'Operation Velvet Vault — Industrial Pig Butchering Syndicate',
        description: 'Multi-jurisdictional syndicate laundering stolen retail USDT through decentralized bridges and nested OTC desks.',
        status: 'active',
        priority: 'critical',
        fraud_type: 'pig_butchering',
        reported_amount_usd: 4250000,
        target_address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        network: 'ETH',
        victim_ref: 'VIC-TX-2023-991',
        notes: 'Urgent freeze requested via INTERPOL Red Notice protocol.',
        assigned_to: 'a1000000-0000-0000-0000-000000000001',
        created_by: 'a1000000-0000-0000-0000-000000000002',
        created_at: '2026-08-31T14:10:00.000Z',
        updated_at: '2026-08-31T14:10:00.000Z',
      },
      {
        id: 'c2000000-0000-0000-0000-000000000002',
        case_id: 'INV-2024-0119',
        title: 'Lazarus Heist Split-Hop Exfiltration',
        description: 'State-sponsored APT laundering funds originating from decentralized lending pool exploit across mixers.',
        status: 'escalated',
        priority: 'critical',
        fraud_type: 'hacks',
        reported_amount_usd: 18900000,
        target_address: '0x9c4f196720e17639bb409d57a6279f0411fa12e9',
        network: 'ETH',
        victim_ref: 'DEF-DAO-HACK-01',
        notes: 'Funds split across 12 hops before Tornado Cash router.',
        assigned_to: 'a1000000-0000-0000-0000-000000000002',
        created_by: 'a1000000-0000-0000-0000-000000000002',
        created_at: '2026-08-30T10:00:00.000Z',
        updated_at: '2026-08-30T10:00:00.000Z',
      },
    ];

    for (const c of cases) {
      this.cases.set(c.case_id, c);
    }
  }

  private seedEvidence(): void {
    const evidenceList: InternalDbEvidence[] = [
      {
        id: 'e1200000-0000-0000-0000-000000000001',
        evidence_number: 'EVD-2023-0842-01',
        case_id: 'INV-2023-0842',
        title: 'Forensic On-Chain Graph Extraction',
        description: 'Complete 5-hop fund flow visualization and UTXO ledger snapshot.',
        evidence_type: 'TRANSACTION_TRACE',
        file_name: 'inv_2023_0842_graph_snapshot.json',
        file_size_bytes: 4512080,
        sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        chain_of_custody_status: 'SEALED',
        subpoena_hold_active: true,
        collected_by: 'a1000000-0000-0000-0000-000000000001',
        verified_by: 'a1000000-0000-0000-0000-000000000002',
        collected_at: '2026-08-31T14:15:20.000Z',
      },
    ];

    for (const e of evidenceList) {
      this.evidence.set(e.evidence_number, e);
    }
  }

  private seedNcrpComplaints(): void {
    const complaints: NcrpComplaint[] = [
      {
        id: 'ncrp-c10001',
        acknowledgmentNo: '20241029001928',
        policeStation: 'Cyber Crime Police Station, South-West',
        district: 'Dwarka',
        state: 'Delhi',
        complainantName: 'Rajesh K. Sharma',
        complainantContact: '+91 98*** **421',
        incidentDate: '2026-08-28T09:30:00.000Z',
        reportedDate: '2026-08-29T11:45:00.000Z',
        crimeCategory: 'Task-Based Fraud / Pig Butchering',
        fraudAmountInr: 4850000,
        fraudAmountUsd: 58200,
        status: 'ON_CHAIN_TRACED',
        linkedCaseId: 'INV-2023-0842',
        assignedOfficer: 'Insp. Rakesh Kumar',
        officerBadge: 'DL-CY-8812',
        cfcfrmsAlertId: 'CFC-DEL-2026-90412',
        notes: 'Victim lured into Telegram task group posing as e-commerce rating agency. Funds transferred through 4 mule bank accounts and swapped to USDT on Binance P2P and CoinDCX.',
        crossIncidentMatches: 4,
        suspectWallets: [
          {
            address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
            blockchain: 'Ethereum',
            layer: 'L1 Deposit',
            reportedLossUsd: 42000,
            reportedLossInr: 3500000,
            txHash: '0x4f3a71b89cd176a982df09a12c84210e7b9278912d098bc194726ef1092a481c',
            attributedEntity: 'CoinDCX Deposit Cluster',
            riskScore: 92,
          },
          {
            address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            blockchain: 'Tron',
            layer: 'L2 Mixing/Bridge',
            reportedLossUsd: 16200,
            reportedLossInr: 1350000,
            txHash: '0x889a712f08129038baed09182390182309182039810293810293810293812039',
            attributedEntity: 'Cross-Chain Bridge / Swapper',
            riskScore: 84,
          },
        ],
        bankTrail: [
          {
            bankName: 'HDFC Bank',
            accountNumberMasked: '50100492****18',
            ifscCode: 'HDFC0001202',
            utrNumber: 'HDFC240828001928',
            amountInr: 2500000,
            freezeStatus: 'FUNDS_FROZEN',
          },
          {
            bankName: 'Axis Bank',
            accountNumberMasked: '92102005****44',
            ifscCode: 'UTIB0000412',
            utrNumber: 'AXIS240828091822',
            amountInr: 2350000,
            freezeStatus: 'LIEN_MARKED',
          },
        ],
        actionTakenReport: {
          atrId: 'ATR-DEL-2026-0842',
          complaintId: 'ncrp-c10001',
          preparedBy: 'I. Kerman',
          badgeNumber: 'LEA-4892',
          policeStation: 'Cyber Crime Police Station, South-West Delhi',
          dateGenerated: '2026-08-31T14:30:00.000Z',
          summaryOfInvestigation: 'Complete on-chain fund path identified across 3 hops terminating at CoinDCX KYC-verified account.',
          fundTracingPathSummary: 'HDFC -> Axis Mule -> Binance P2P -> Suspect 0x71c7... -> CoinDCX Hot Wallet',
          identifiedVasps: ['CoinDCX', 'Binance'],
          totalFrozenAmountInr: 1420000,
          totalFrozenAmountUsd: 17040,
          bsaSection63CertHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
          courtNoticeReference: 'CR-SEC94-DEL-2026-88',
        },
      },
      {
        id: 'ncrp-c10002',
        acknowledgmentNo: '20241105004112',
        policeStation: 'Central Cyber Crime Police Station',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        complainantName: 'Ananya Iyer',
        complainantContact: '+91 94*** **839',
        incidentDate: '2026-08-25T14:00:00.000Z',
        reportedDate: '2026-08-26T16:10:00.000Z',
        crimeCategory: 'Cryptocurrency Investment Scam',
        fraudAmountInr: 12400000,
        fraudAmountUsd: 148800,
        status: 'FREEZE_INITIATED',
        linkedCaseId: 'INV-2024-0119',
        assignedOfficer: 'ACP Mohan Das',
        officerBadge: 'KA-CY-1002',
        cfcfrmsAlertId: 'CFC-BLR-2026-44109',
        notes: 'Victim persuaded by WhatsApp financial advisory syndicate to stake USDT in bogus VIP Arbitrage pool. Funds routed via split-hop exfiltration to Tornado Cash and Binance deposit accounts.',
        crossIncidentMatches: 6,
        suspectWallets: [
          {
            address: '0x9c4f196720e17639bb409d57a6279f0411fa12e9',
            blockchain: 'Ethereum',
            layer: 'L1 Deposit',
            reportedLossUsd: 148800,
            reportedLossInr: 12400000,
            txHash: '0x3a19df827361849102c918239018230918239018239018239018239018239018',
            attributedEntity: 'High-Risk Arbitrage Router',
            riskScore: 98,
          },
        ],
        bankTrail: [
          {
            bankName: 'State Bank of India',
            accountNumberMasked: '38190293****01',
            ifscCode: 'SBIN0004018',
            utrNumber: 'SBIN240825008129',
            amountInr: 6200000,
            freezeStatus: 'FUNDS_FROZEN',
          },
          {
            bankName: 'ICICI Bank',
            accountNumberMasked: '00192837****90',
            ifscCode: 'ICIC0000019',
            utrNumber: 'ICIC240825102938',
            amountInr: 6200000,
            freezeStatus: 'FREEZE_REQUESTED',
          },
        ],
      },
      {
        id: 'ncrp-c10003',
        acknowledgmentNo: '20241112009831',
        policeStation: 'BKC Cyber Police Station',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        complainantName: 'Vikram Singhania',
        complainantContact: '+91 91*** **210',
        incidentDate: '2026-08-20T18:20:00.000Z',
        reportedDate: '2026-08-21T09:15:00.000Z',
        crimeCategory: 'P2P Escrow Fraud',
        fraudAmountInr: 3250000,
        fraudAmountUsd: 39000,
        status: 'LIEN_MARKED',
        assignedOfficer: 'Insp. Savita Deshmukh',
        officerBadge: 'MH-CY-4519',
        cfcfrmsAlertId: 'CFC-MUM-2026-11849',
        notes: 'Off-exchange P2P merchant transaction. Scammer took fiat payment in Kotak Mahindra mule account and failed to release USDT.',
        crossIncidentMatches: 2,
        suspectWallets: [
          {
            address: '0x28c6c06298d514db089934071355e5743bf21d60',
            blockchain: 'Ethereum',
            layer: 'L3 VASP Cashing Out',
            reportedLossUsd: 39000,
            reportedLossInr: 3250000,
            attributedEntity: 'Binance Hot Wallet 14',
            riskScore: 78,
          },
        ],
        bankTrail: [
          {
            bankName: 'Kotak Mahindra Bank',
            accountNumberMasked: '71029384****19',
            ifscCode: 'KKBK0000921',
            utrNumber: 'KKBK240820991823',
            amountInr: 3250000,
            freezeStatus: 'LIEN_MARKED',
          },
        ],
      },
      {
        id: 'ncrp-c10004',
        acknowledgmentNo: '20241118012390',
        policeStation: 'Cyberabad Cyber Police Station',
        district: 'Cyberabad',
        state: 'Telangana',
        complainantName: 'Dr. K. Srinivas',
        complainantContact: '+91 99*** **774',
        incidentDate: '2026-08-27T11:00:00.000Z',
        reportedDate: '2026-08-27T19:40:00.000Z',
        crimeCategory: 'Fake Exchange / Cloud Mining dApp',
        fraudAmountInr: 8700000,
        fraudAmountUsd: 104400,
        status: 'UNDER_TRIAGE',
        assignedOfficer: 'DSP V. Reddy',
        officerBadge: 'TG-CY-0048',
        notes: 'Phishing approval transaction on malicious USDT staking contract that permitted unlimited withdrawal allowance.',
        crossIncidentMatches: 3,
        suspectWallets: [
          {
            address: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
            blockchain: 'Ethereum',
            layer: 'L1 Deposit',
            reportedLossUsd: 104400,
            reportedLossInr: 8700000,
            attributedEntity: 'Bitfinex / Kraken Deposit Intermediary',
            riskScore: 89,
          },
        ],
        bankTrail: [
          {
            bankName: 'Canara Bank',
            accountNumberMasked: '12093847****33',
            ifscCode: 'CNRB0001048',
            utrNumber: 'CNRB240827110948',
            amountInr: 8700000,
            freezeStatus: 'FREEZE_REQUESTED',
          },
        ],
      },
      {
        id: 'ncrp-c10005',
        acknowledgmentNo: '20241124015567',
        policeStation: 'Ahmedabad Cyber Crime Police Station',
        district: 'Ahmedabad City',
        state: 'Gujarat',
        complainantName: 'Mehul Patel',
        complainantContact: '+91 97*** **902',
        incidentDate: '2026-08-15T08:00:00.000Z',
        reportedDate: '2026-08-15T12:00:00.000Z',
        crimeCategory: 'Ransomware / Extortion',
        fraudAmountInr: 21500000,
        fraudAmountUsd: 258000,
        status: 'REGISTERED',
        assignedOfficer: 'Insp. Hardik Zala',
        officerBadge: 'GJ-CY-7719',
        notes: 'Manufacturing unit database encrypted by LockBit 3.0 affiliate. Ransom paid in BTC to unhosted address.',
        crossIncidentMatches: 1,
        suspectWallets: [
          {
            address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            blockchain: 'Bitcoin',
            layer: 'L1 Deposit',
            reportedLossUsd: 258000,
            reportedLossInr: 21500000,
            attributedEntity: 'LockBit Affiliate Wallet Cluster',
            riskScore: 99,
          },
        ],
        bankTrail: [],
      },
    ];

    for (const c of complaints) {
      this.ncrpComplaints.set(c.id, c);
    }
  }

  private seedVaspNodalDirectory(): void {
    const vasps: VaspNodalContact[] = [
      {
        vaspId: 'vasp-coindcx',
        entityName: 'CoinDCX',
        registeredEntity: 'Neblio Technologies Pvt. Ltd.',
        fiuRegistrationNumber: 'FIU-IND/VASP/2023/001',
        jurisdiction: 'India (Mumbai / Bengaluru)',
        nodalOfficerName: 'Adv. Rohit Soni',
        nodalEmail: 'nodal.lea@coindcx.com',
        emergencyContact: '+91-80-4822-9011',
        lawEnforcementPortalUrl: 'https://coindcx.com/legal/lea-request',
        averageSlaHours: 12,
        supportedNoticeTypes: ['SECTION_94_BNSS', 'SECTION_107_BNSS', 'FIU_PMLA_COORDINATION'],
        status: 'ACTIVE',
      },
      {
        vaspId: 'vasp-wazirx',
        entityName: 'WazirX',
        registeredEntity: 'Zanmai Labs Pvt. Ltd.',
        fiuRegistrationNumber: 'FIU-IND/VASP/2023/002',
        jurisdiction: 'India (Mumbai)',
        nodalOfficerName: 'Naveen Aggarwal',
        nodalEmail: 'lawenforcement@wazirx.com',
        emergencyContact: '+91-22-6899-4400',
        lawEnforcementPortalUrl: 'https://wazirx.com/law-enforcement',
        averageSlaHours: 24,
        supportedNoticeTypes: ['SECTION_94_BNSS', 'SECTION_107_BNSS'],
        status: 'ACTIVE',
      },
      {
        vaspId: 'vasp-coinswitch',
        entityName: 'CoinSwitch Kuber',
        registeredEntity: 'Bitcipher Labs LLP',
        fiuRegistrationNumber: 'FIU-IND/VASP/2023/004',
        jurisdiction: 'India (Bengaluru)',
        nodalOfficerName: 'Priya Sundaram',
        nodalEmail: 'lea.compliance@coinswitch.co',
        emergencyContact: '+91-80-6819-2233',
        lawEnforcementPortalUrl: 'https://coinswitch.co/lea-compliance',
        averageSlaHours: 18,
        supportedNoticeTypes: ['SECTION_94_BNSS', 'SECTION_107_BNSS'],
        status: 'ACTIVE',
      },
      {
        vaspId: 'vasp-binance-in',
        entityName: 'Binance India Liaison',
        registeredEntity: 'Nest Services Limited / Binance FIU Unit',
        fiuRegistrationNumber: 'FIU-IND/VASP/2024/019',
        jurisdiction: 'Global (India Regd Liaison)',
        nodalOfficerName: 'Global Law Enforcement Desk (India Cell)',
        nodalEmail: 'lea-in@binance.com',
        emergencyContact: '+1-800-BINANCE-LEA',
        lawEnforcementPortalUrl: 'https://kodexglobal.com/binance',
        averageSlaHours: 24,
        supportedNoticeTypes: ['SECTION_94_BNSS', 'SECTION_107_BNSS', 'SECTION_111_BNSS'],
        status: 'ACTIVE',
      },
      {
        vaspId: 'vasp-zebpay',
        entityName: 'ZebPay',
        registeredEntity: 'Awlencan Innovations India Pvt. Ltd.',
        fiuRegistrationNumber: 'FIU-IND/VASP/2023/007',
        jurisdiction: 'India (Ahmedabad)',
        nodalOfficerName: 'M. K. Verma',
        nodalEmail: 'compliance-nodal@zebpay.com',
        emergencyContact: '+91-79-4022-8811',
        lawEnforcementPortalUrl: 'https://zebpay.com/in/lea',
        averageSlaHours: 24,
        supportedNoticeTypes: ['SECTION_94_BNSS', 'SECTION_107_BNSS'],
        status: 'ACTIVE',
      },
      {
        vaspId: 'vasp-mudrex',
        entityName: 'Mudrex',
        registeredEntity: 'Mudrex FinTech India Pvt. Ltd.',
        fiuRegistrationNumber: 'FIU-IND/VASP/2023/011',
        jurisdiction: 'India (Bengaluru)',
        nodalOfficerName: 'Deepak Chawla',
        nodalEmail: 'legal@mudrex.com',
        emergencyContact: '+91-80-4591-1002',
        lawEnforcementPortalUrl: 'https://mudrex.com/lea-in',
        averageSlaHours: 24,
        supportedNoticeTypes: ['SECTION_94_BNSS', 'SECTION_107_BNSS'],
        status: 'ACTIVE',
      },
      {
        vaspId: 'vasp-kucoin',
        entityName: 'KuCoin',
        registeredEntity: 'KuCoin Global FIU Liaison',
        fiuRegistrationNumber: 'FIU-IND/VASP/2024/022',
        jurisdiction: 'Seychelles / FIU Registered',
        nodalOfficerName: 'International Subpoena Team',
        nodalEmail: 'subpoena@kucoin.com',
        emergencyContact: '+248-467-1900',
        lawEnforcementPortalUrl: 'https://kucoin.com/law-enforcement',
        averageSlaHours: 36,
        supportedNoticeTypes: ['SECTION_94_BNSS', 'SECTION_107_BNSS'],
        status: 'ACTIVE',
      },
    ];

    for (const v of vasps) {
      this.vaspNodalDirectory.set(v.vaspId, v);
    }
  }

  private seedSahyogNotices(): void {
    const notices: SahyogNotice[] = [
      {
        id: 'sahyog-not-001',
        noticeNo: 'SAHYOG/LEA/2026/SEC94-0842',
        noticeType: 'SECTION_94_BNSS',
        caseId: 'INV-2023-0842',
        ncrpAckNo: '20241029001928',
        targetVaspId: 'vasp-coindcx',
        targetVaspName: 'CoinDCX (Neblio Technologies)',
        nodalOfficerName: 'Adv. Rohit Soni',
        nodalOfficerEmail: 'nodal.lea@coindcx.com',
        fiuRegistrationNumber: 'FIU-IND/VASP/2023/001',
        issuingAgency: 'Financial Crimes Cyber Enforcement (SIH) / Delhi Cyber Cell',
        investigatingOfficerName: 'I. Kerman',
        investigatingOfficerBadge: 'LEA-4892',
        investigatingOfficerDesignation: 'Senior Cyber Forensic Inspector',
        policeStation: 'Cyber Crime Police Station, South-West Delhi',
        subjectAddresses: ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'],
        subjectTxHashes: ['0x4f3a71b89cd176a982df09a12c84210e7b9278912d098bc194726ef1092a481c'],
        demandedActions: [
          'Immediate production of full KYC dossier (Aadhaar, PAN, Passport, Live Photo)',
          'Complete login IP access logs with port & timestamp history',
          'Linked Indian bank account details (Bank, A/C, IFSC, UPI handles)',
          'Full deposit/withdrawal transaction history with counterparty addresses',
        ],
        complianceDeadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
        status: 'KYC_RECEIVED',
        createdAt: '2026-08-31T15:00:00.000Z',
        updatedAt: '2026-09-01T09:20:00.000Z',
        digitalSealHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        responseSummary: {
          receivedAt: '2026-09-01T09:18:00.000Z',
          kycIdentifiedName: 'Rameshwar Alok (Alias: Rex Trader)',
          registeredMobile: '+91 98110 49182',
          registeredEmail: 'r.alok91@protonmail.com',
          bankAccountLinked: 'HDFC Bank A/C 50100492194812',
          associatedIpLogs: ['103.211.54.12 (Delhi, Airtel)', '45.112.89.201 (VPN Gateway)'],
          frozenAmountInr: 1420000,
          frozenAmountUsd: 17040,
          seizureReferenceNo: 'SEZ-CDX-2026-4491',
          remarks: 'Account placed on hard withdrawal block. Total 17,040 USDT balance locked in regulatory escrow.',
        },
      },
      {
        id: 'sahyog-not-002',
        noticeNo: 'SAHYOG/LEA/2026/SEC107-0119',
        noticeType: 'SECTION_107_BNSS',
        caseId: 'INV-2024-0119',
        ncrpAckNo: '20241105004112',
        targetVaspId: 'vasp-binance-in',
        targetVaspName: 'Binance India Liaison (Nest Services)',
        nodalOfficerName: 'Global Law Enforcement Desk (India Cell)',
        nodalOfficerEmail: 'lea-in@binance.com',
        fiuRegistrationNumber: 'FIU-IND/VASP/2024/019',
        issuingAgency: 'Federal Bureau of Investigation — Cyber Task Force / I4C Desk',
        investigatingOfficerName: 'S. Connor',
        investigatingOfficerBadge: 'FBI-CYBER-09',
        investigatingOfficerDesignation: 'Lead Cyber Task Force Agent',
        policeStation: 'Joint Cyber Cell Bengaluru / I4C National Desk',
        subjectAddresses: ['0x9c4f196720e17639bb409d57a6279f0411fa12e9'],
        demandedActions: [
          'Immediate statutory asset seizure and freeze under Section 107 BNSS / Section 102 CrPC',
          'Lien marking on user UID and all sub-accounts',
          'Prevent all fiat off-ramping and P2P merchant orders',
          'Deposit seized balance in Designated Court Custody / Law Enforcement Escrow',
        ],
        complianceDeadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        status: 'ASSETS_FROZEN',
        createdAt: '2026-08-30T11:00:00.000Z',
        updatedAt: '2026-08-30T17:30:00.000Z',
        digitalSealHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        responseSummary: {
          receivedAt: '2026-08-30T17:25:00.000Z',
          kycIdentifiedName: 'M/s Phoenix Syndicate Ltd (Offshore UID 88910411)',
          registeredEmail: 'ops@phoenix-capital-syndicate.io',
          frozenAmountUsd: 42500,
          frozenAmountInr: 3540000,
          seizureReferenceNo: 'BIN-FRZ-LEA-2026-9901',
          remarks: 'Target UID frozen immediately upon receipt of Section 107 BNSS notice. $42,500 USDT secured.',
        },
      },
      {
        id: 'sahyog-not-003',
        noticeNo: 'SAHYOG/LEA/2026/SEC94-1044',
        noticeType: 'SECTION_94_BNSS',
        caseId: 'INV-2023-0842',
        targetVaspId: 'vasp-wazirx',
        targetVaspName: 'WazirX (Zanmai Labs)',
        nodalOfficerName: 'Naveen Aggarwal',
        nodalOfficerEmail: 'lawenforcement@wazirx.com',
        fiuRegistrationNumber: 'FIU-IND/VASP/2023/002',
        issuingAgency: 'Financial Crimes Cyber Enforcement (SIH)',
        investigatingOfficerName: 'I. Kerman',
        investigatingOfficerBadge: 'LEA-4892',
        investigatingOfficerDesignation: 'Senior Cyber Forensic Inspector',
        policeStation: 'Cyber Crime Police Station, South-West Delhi',
        subjectAddresses: ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'],
        demandedActions: [
          'Production of transaction ledger for INR-USDT P2P pairs',
          'Bank accounts linked to suspect seller UID',
        ],
        complianceDeadline: new Date(Date.now() + 32 * 3600 * 1000).toISOString(),
        status: 'COMPLIANCE_IN_PROGRESS',
        createdAt: '2026-09-01T10:00:00.000Z',
        updatedAt: '2026-09-01T10:05:00.000Z',
        digitalSealHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      },
    ];

    for (const n of notices) {
      this.sahyogNotices.set(n.id, n);
    }
  }

  private seedSahyogWorkspaces(): void {
    const workspaces: SahyogWorkspace[] = [
      {
        id: 'ws-001',
        operationCode: 'OP-CHAKRA-III',
        title: 'Operation Chakra-III: Transnational Task Fraud & Mule Network',
        description: 'Multi-agency task force dismantling Southeast Asian pig-butchering syndicates operating mule accounts across 14 Indian states with crypto off-ramping.',
        leadAgency: 'Central Bureau of Investigation (CBI) — Cyber Crime Division',
        participatingAgencies: [
          'Delhi Police Cyber Cell',
          'Telangana Cyber Security Bureau (T-CSB)',
          'Enforcement Directorate (ED)',
          'Financial Intelligence Unit (FIU-IND)',
        ],
        priority: 'critical',
        status: 'ACTIVE',
        targetWalletsCount: 28,
        totalDefraudedInr: 142000000,
        totalFrozenInr: 38500000,
        createdAt: '2026-07-15T10:00:00.000Z',
        updatedAt: '2026-09-01T12:00:00.000Z',
      },
      {
        id: 'ws-002',
        operationCode: 'OP-GARUDA-MULE',
        title: 'Operation Garuda: P2P Crypto Syndicate Takedown',
        description: 'Joint inter-state investigation tracking illegal Chinese investment apps funneling funds via unverified Telegram P2P escrow channels.',
        leadAgency: 'Telangana Cyber Security Bureau (T-CSB)',
        participatingAgencies: [
          'Karnataka CID Cyber Crime',
          'Maharashtra Cyber (BKC)',
          'Gujarat Cyber Crime Cell',
        ],
        priority: 'high',
        status: 'ACTIVE',
        targetWalletsCount: 19,
        totalDefraudedInr: 68000000,
        totalFrozenInr: 18400000,
        createdAt: '2026-08-01T09:30:00.000Z',
        updatedAt: '2026-08-28T16:00:00.000Z',
      },
    ];

    for (const w of workspaces) {
      this.sahyogWorkspaces.set(w.id, w);
    }

    const bulletins: IntelligenceBulletin[] = [
      {
        id: 'bull-001',
        bulletinNumber: 'I4C-INTEL-2026-409',
        title: 'Emergence of Nested Tron TRC-20 Mixing Aggregators in Telegram Task Scams',
        authorAgency: 'Indian Cyber Crime Coordination Centre (I4C)',
        threatCategory: 'Pig Butchering / Task Fraud',
        targetWallets: ['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'],
        modusOperandi: 'Syndicates using fast TRC-20 swaps before converting to Monero or routing through Indian registered exchanges with spoofed KYC.',
        publishedAt: '2026-08-30T10:00:00.000Z',
        urgency: 'URGENT',
      },
      {
        id: 'bull-002',
        bulletinNumber: 'CBI-CCD-2026-088',
        title: 'Advisory on Fake IPO Allotment dApps Exploiting Web3 Signature Approvals',
        authorAgency: 'CBI Cyber Crime Division',
        threatCategory: 'DeFi Phishing / Signature Drainer',
        targetWallets: ['0x9c4f196720e17639bb409d57a6279f0411fa12e9'],
        modusOperandi: 'Perpetrators sending phishing links to retail investors promising pre-IPO crypto allocations, triggering Permit2 unbounded allowance drainage.',
        publishedAt: '2026-08-26T14:30:00.000Z',
        urgency: 'PRIORITY',
      },
    ];

    for (const b of bulletins) {
      this.intelligenceBulletins.set(b.id, b);
    }
  }

  public toSafeUser(user: InternalDbUser): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      badgeNumber: user.badge_number,
      role: user.role,
      agency: user.agency,
      avatarUrl: user.avatar_url,
      permissions: ROLE_PERMISSIONS[user.role] || [],
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
    };
  }

  public findUserByEmail(email: string): InternalDbUser | undefined {
    return this.users.get(email.toLowerCase().trim());
  }

  public async verifyPassword(user: InternalDbUser, plainPassword: string): Promise<boolean> {
    if (!user.is_active) return false;
    return bcrypt.compare(plainPassword, user.password_hash);
  }
}

export const mockStore = MockStore.getInstance();
