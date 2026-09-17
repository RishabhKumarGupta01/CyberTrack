/**
 * CryptoTrace Intelligence Platform — NCRP & SAHYOG Client Service
 * 
 * Provides typed operations for interacting with NCRP and SAHYOG forensic gateways.
 */

import { apiClient, ApiResponse } from './api';
import {
  NcrpComplaint,
  ActionTakenReport,
  SahyogNotice,
  VaspNodalContact,
  SahyogWorkspace,
  IntelligenceBulletin,
} from '../types/ncrpSahyog';

export interface CrossCheckResult {
  targetAddress: string;
  matchFound: boolean;
  matchesCount: number;
  totalLossInr: number;
  totalLossUsd: number;
  statesInvolved: string[];
  complaints: Array<{
    acknowledgmentNo: string;
    policeStation: string;
    state: string;
    complainantName: string;
    crimeCategory: string;
    fraudAmountInr: number;
    status: string;
    reportedDate: string;
  }>;
}

export class NcrpSahyogService {
  /* ============================================================
     NCRP Portal Client Methods
     ============================================================ */

  public static async getComplaints(params?: {
    status?: string;
    state?: string;
    crimeCategory?: string;
    search?: string;
  }): Promise<{ complaints: NcrpComplaint[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.state) query.append('state', params.state);
    if (params?.crimeCategory) query.append('crimeCategory', params.crimeCategory);
    if (params?.search) query.append('search', params.search);

    const qs = query.toString();
    const endpoint = `/api/v1/ncrp/complaints${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<NcrpComplaint[]>(endpoint);
    return {
      complaints: res.data || [],
      meta: res.meta,
    };
  }

  public static async getComplaintById(id: string): Promise<NcrpComplaint> {
    const res = await apiClient.get<NcrpComplaint>(`/api/v1/ncrp/complaints/${encodeURIComponent(id)}`);
    if (!res.data) throw new Error('Complaint not found.');
    return res.data;
  }

  public static async createComplaint(payload: Partial<NcrpComplaint>): Promise<NcrpComplaint> {
    const res = await apiClient.post<NcrpComplaint>('/api/v1/ncrp/complaints', payload);
    if (!res.data) throw new Error('Failed to ingest NCRP complaint.');
    return res.data;
  }

  public static async linkComplaintToCase(id: string, caseId: string): Promise<NcrpComplaint> {
    const res = await apiClient.post<NcrpComplaint>(`/api/v1/ncrp/complaints/${encodeURIComponent(id)}/link-case`, {
      caseId,
    });
    if (!res.data) throw new Error('Failed to link NCRP complaint to case.');
    return res.data;
  }

  public static async issueRapidFreeze(id: string): Promise<NcrpComplaint> {
    const res = await apiClient.post<NcrpComplaint>(`/api/v1/ncrp/complaints/${encodeURIComponent(id)}/freeze`, {});
    if (!res.data) throw new Error('Failed to dispatch 1930 / CFCFRMS rapid freeze.');
    return res.data;
  }

  public static async exportAtr(payload: {
    complaintId: string;
    summaryOfInvestigation?: string;
    fundTracingPathSummary?: string;
    identifiedVasps?: string[];
    totalFrozenAmountInr?: number;
    courtNoticeReference?: string;
  }): Promise<ActionTakenReport> {
    const res = await apiClient.post<ActionTakenReport>('/api/v1/ncrp/export-atr', payload);
    if (!res.data) throw new Error('Failed to generate Action Taken Report.');
    return res.data;
  }

  public static async crossCheckAddress(address: string): Promise<CrossCheckResult> {
    const res = await apiClient.get<CrossCheckResult>(`/api/v1/ncrp/cross-check/${encodeURIComponent(address)}`);
    return (
      res.data || {
        targetAddress: address,
        matchFound: false,
        matchesCount: 0,
        totalLossInr: 0,
        totalLossUsd: 0,
        statesInvolved: [],
        complaints: [],
      }
    );
  }

  /* ============================================================
     SAHYOG Platform Client Methods
     ============================================================ */

  public static async getNotices(params?: {
    status?: string;
    noticeType?: string;
    caseId?: string;
    vaspId?: string;
  }): Promise<{ notices: SahyogNotice[]; meta?: any }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.noticeType) query.append('noticeType', params.noticeType);
    if (params?.caseId) query.append('caseId', params.caseId);
    if (params?.vaspId) query.append('vaspId', params.vaspId);

    const qs = query.toString();
    const endpoint = `/api/v1/sahyog/notices${qs ? `?${qs}` : ''}`;
    const res = await apiClient.get<SahyogNotice[]>(endpoint);
    return {
      notices: res.data || [],
      meta: res.meta,
    };
  }

  public static async getNoticeById(id: string): Promise<SahyogNotice> {
    const res = await apiClient.get<SahyogNotice>(`/api/v1/sahyog/notices/${encodeURIComponent(id)}`);
    if (!res.data) throw new Error('Notice not found.');
    return res.data;
  }

  public static async dispatchNotice(payload: {
    noticeType: string;
    caseId: string;
    ncrpAckNo?: string;
    targetVaspId: string;
    subjectAddresses: string[];
    subjectTxHashes?: string[];
    demandedActions?: string[];
    deadlineHours?: number;
    policeStation?: string;
    designation?: string;
  }): Promise<SahyogNotice> {
    const res = await apiClient.post<SahyogNotice>('/api/v1/sahyog/notices', payload);
    if (!res.data) throw new Error('Failed to dispatch SAHYOG statutory notice.');
    return res.data;
  }

  public static async updateNoticeStatus(
    id: string,
    status: string,
    responseSummary?: any
  ): Promise<SahyogNotice> {
    const res = await apiClient.put<SahyogNotice>(`/api/v1/sahyog/notices/${encodeURIComponent(id)}/status`, {
      status,
      responseSummary,
    });
    if (!res.data) throw new Error('Failed to update notice status.');
    return res.data;
  }

  public static async getVaspDirectory(): Promise<VaspNodalContact[]> {
    const res = await apiClient.get<VaspNodalContact[]>('/api/v1/sahyog/directory');
    return res.data || [];
  }

  public static async getWorkspaces(): Promise<{
    workspaces: SahyogWorkspace[];
    bulletins: IntelligenceBulletin[];
  }> {
    const res = await apiClient.get<{
      workspaces: SahyogWorkspace[];
      bulletins: IntelligenceBulletin[];
    }>('/api/v1/sahyog/workspaces');

    return (
      res.data || {
        workspaces: [],
        bulletins: [],
      }
    );
  }

  public static async createWorkspace(payload: {
    operationCode: string;
    title: string;
    description: string;
    participatingAgencies: string[];
    priority?: string;
    targetWalletsCount?: number;
  }): Promise<SahyogWorkspace> {
    const res = await apiClient.post<SahyogWorkspace>('/api/v1/sahyog/workspaces', payload);
    if (!res.data) throw new Error('Failed to create SAHYOG workspace.');
    return res.data;
  }
}
