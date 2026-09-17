/**
 * CryptoTrace Intelligence Platform — Supabase Data Access Service
 * 
 * Provides typed operations for cases, evidence, and audit logs using Supabase PostgreSQL.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Case } from '../types';
import { AuditLogRecord } from '../reports/types';
import { apiClient } from './api';

export interface SupabaseCasePayload {
  case_id: string;
  title: string;
  description?: string;
  priority: string;
  fraud_type: string;
  reported_amount_usd: number;
  target_address: string;
  network: string;
  victim_ref?: string;
  notes?: string;
}

export class SupabaseService {
  /**
   * Fetches all cases from Supabase or the forensic API gateway.
   */
  public static async getCases(): Promise<Case[]> {
    // 1. Try Supabase direct read if configured
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((c: any) => ({
            id: c.id,
            caseId: c.case_id,
            title: c.title,
            description: c.description,
            status: c.status,
            priority: c.priority,
            fraudType: c.fraud_type,
            reportedAmountUsd: Number(c.reported_amount_usd),
            targetAddress: c.target_address,
            network: c.network,
            victimRef: c.victim_ref,
            notes: c.notes,
            assignedTo: c.assigned_to,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));
        }
      } catch (err) {
        console.warn('Failed to query direct Supabase cases, falling back to API:', err);
      }
    }

    // 2. Fall back to forensic gateway API (which queries Supabase with service role)
    try {
      const res = await apiClient.get<any[]>('/api/v1/cases');
      if (res.data && Array.isArray(res.data)) {
        return res.data.map((c: any) => ({
          id: c.id,
          caseId: c.case_id || c.caseId,
          title: c.title,
          description: c.description,
          status: c.status,
          priority: c.priority,
          fraudType: c.fraud_type || c.fraudType,
          reportedAmountUsd: Number(c.reported_amount_usd || c.reportedAmountUsd || 0),
          targetAddress: c.target_address || c.targetAddress,
          network: c.network,
          victimRef: c.victim_ref || c.victimRef,
          notes: c.notes,
          assignedTo: c.assigned_to || c.assignedTo,
          createdAt: c.created_at || c.createdAt,
          updatedAt: c.updated_at || c.updatedAt,
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch cases via API:', err);
    }

    return [];
  }

  /**
   * Inserts a new investigation case into Supabase.
   * Leverages direct Supabase insertion when authenticated, or routes via
   * the authenticated backend gateway with service-role privileges.
   */
  public static async createCase(caseData: SupabaseCasePayload): Promise<any> {
    // 1. If user is authenticated in Supabase directly, attempt direct client insert
    if (isSupabaseConfigured()) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data, error } = await supabase
            .from('cases')
            .insert({
              ...caseData,
              created_by: userData.user.id,
              assigned_to: userData.user.id,
            })
            .select()
            .single();

          if (!error && data) {
            // Also notify gateway for unified memory cache / audit log in background
            apiClient.post('/api/v1/cases', {
              caseId: caseData.case_id,
              title: caseData.title,
              description: caseData.description,
              priority: caseData.priority,
              fraudType: caseData.fraud_type,
              reportedAmountUsd: caseData.reported_amount_usd,
              targetAddress: caseData.target_address,
              network: caseData.network,
              victimRef: caseData.victim_ref,
              notes: caseData.notes,
            }).catch(() => {});

            return data;
          }
          console.warn('Direct Supabase insert notice:', error?.message);
        }
      } catch (err) {
        console.warn('Direct Supabase insert notice:', err);
      }
    }

    // 2. Gateway persistence via backend server (which uses administrative service role to write to Supabase)
    const res = await apiClient.post<any>('/api/v1/cases', {
      caseId: caseData.case_id,
      title: caseData.title,
      description: caseData.description,
      priority: caseData.priority,
      fraudType: caseData.fraud_type,
      reportedAmountUsd: caseData.reported_amount_usd,
      targetAddress: caseData.target_address,
      network: caseData.network,
      victimRef: caseData.victim_ref,
      notes: caseData.notes,
    });

    if (res.data) {
      return res.data;
    }

    throw new Error(res.error?.message || 'Failed to persist case to database.');
  }

  /**
   * Appends an audit log record into Supabase.
   */
  public static async logAudit(record: Partial<AuditLogRecord>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('audit_logs').insert({
        action: record.action,
        user_id: userData.user?.id || null,
        user_badge_number: record.user_badge_number || 'LEA-SYSTEM',
        case_id: record.case_id || null,
        wallet_address: record.wallet_address || null,
        details: record.details || {},
        artifact_hash: record.artifact_hash || null,
        prev_log_hash: null,
        tamper_status: 'VERIFIED',
      });

      return !error;
    } catch {
      return false;
    }
  }
}
