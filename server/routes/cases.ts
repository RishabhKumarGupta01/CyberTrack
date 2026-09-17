/**
 * CryptoTrace Intelligence Platform — Cases API Routes
 * 
 * Classification: LAW ENFORCEMENT SENSITIVE // OFFICIAL USE ONLY
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requirePermission } from '../security/rbac';
import { validateBody, createCaseSchema } from '../security/validation';
import { mockStore, InternalDbCase } from '../data/mockStore';
import { auditService } from '../security/auditService';
import { serverSupabase } from '../config/supabase';
import crypto from 'crypto';

export const casesRouter = Router();

/**
 * GET /api/v1/cases
 * List all cases (requires cases:read permission)
 */
casesRouter.get('/', requireAuth, requirePermission('cases:read'), async (_req: Request, res: Response): Promise<void> => {
  let allCases: InternalDbCase[] = Array.from(mockStore.cases.values());

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const sbCases: InternalDbCase[] = data.map((c: any) => ({
          id: c.id,
          case_id: c.case_id,
          title: c.title,
          description: c.description || undefined,
          status: c.status,
          priority: c.priority,
          fraud_type: c.fraud_type,
          reported_amount_usd: Number(c.reported_amount_usd),
          target_address: c.target_address,
          network: c.network,
          victim_ref: c.victim_ref || undefined,
          notes: c.notes || undefined,
          assigned_to: c.assigned_to || undefined,
          created_by: c.created_by || 'system',
          created_at: c.created_at,
          updated_at: c.updated_at,
        }));

        // Synchronize in-memory mock store
        sbCases.forEach((c) => mockStore.cases.set(c.case_id, c));
        allCases = sbCases;
      }
    } catch (err) {
      console.warn('Failed to query Supabase cases on server:', err);
    }
  }

  res.json({
    success: true,
    data: allCases,
    meta: { total: allCases.length },
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/cases/:caseId
 */
casesRouter.get('/:caseId', requireAuth, requirePermission('cases:read'), async (req: Request, res: Response): Promise<void> => {
  const { caseId } = req.params;

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('cases')
        .select('*')
        .eq('case_id', caseId)
        .maybeSingle();

      if (!error && data) {
        const mappedCase: InternalDbCase = {
          id: data.id,
          case_id: data.case_id,
          title: data.title,
          description: data.description || undefined,
          status: data.status,
          priority: data.priority,
          fraud_type: data.fraud_type,
          reported_amount_usd: Number(data.reported_amount_usd),
          target_address: data.target_address,
          network: data.network,
          victim_ref: data.victim_ref || undefined,
          notes: data.notes || undefined,
          assigned_to: data.assigned_to || undefined,
          created_by: data.created_by || 'system',
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        mockStore.cases.set(caseId, mappedCase);
        res.json({
          success: true,
          data: mappedCase,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch case from Supabase on server:', err);
    }
  }

  const caseItem = mockStore.cases.get(caseId);
  if (!caseItem) {
    res.status(404).json({
      success: false,
      error: { code: 'CASE_NOT_FOUND', message: `Case ${caseId} not found.` },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.json({
    success: true,
    data: caseItem,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/v1/cases
 * Create new case with validation, RBAC enforcement, and audit logging
 */
casesRouter.post(
  '/',
  requireAuth,
  requirePermission('cases:create'),
  validateBody(createCaseSchema),
  async (req: Request, res: Response): Promise<void> => {
    const {
      caseId,
      title,
      description,
      priority,
      fraudType,
      reportedAmountUsd,
      targetAddress,
      network,
      victimRef,
      notes,
    } = req.body;

    if (mockStore.cases.has(caseId)) {
      res.status(409).json({
        success: false,
        error: { code: 'CASE_ALREADY_EXISTS', message: `Case with identifier ${caseId} already exists.` },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const newCase: InternalDbCase = {
      id: `c20-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      case_id: caseId,
      title,
      description,
      status: 'active',
      priority,
      fraud_type: fraudType,
      reported_amount_usd: reportedAmountUsd,
      target_address: targetAddress,
      network,
      victim_ref: victimRef,
      notes,
      assigned_to: req.user!.sub,
      created_by: req.user!.sub,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attempt to resolve Supabase User ID for foreign key integrity
    let supabaseUserId: string | null = null;
    if (serverSupabase && req.user?.email) {
      try {
        const { data: sbUser } = await serverSupabase
          .from('users')
          .select('id')
          .eq('email', req.user.email)
          .maybeSingle();
        if (sbUser?.id) {
          supabaseUserId = sbUser.id;
        }
      } catch {
        // Continue with null if user cannot be queried
      }
    }

    // Persist directly to Supabase PostgreSQL database
    if (serverSupabase) {
      try {
        const { data: sbCase, error: sbError } = await serverSupabase
          .from('cases')
          .insert({
            case_id: caseId,
            title,
            description: description || null,
            status: 'active',
            priority,
            fraud_type: fraudType,
            reported_amount_usd: reportedAmountUsd,
            target_address: targetAddress,
            network: network.toUpperCase(),
            victim_ref: victimRef || null,
            notes: notes || null,
            assigned_to: supabaseUserId,
            created_by: supabaseUserId,
          })
          .select()
          .single();

        if (sbError) {
          console.warn('Supabase server insertion notice:', sbError.message);
        } else if (sbCase?.id) {
          newCase.id = sbCase.id;
        }
      } catch (err: any) {
        console.warn('Supabase server insert exception:', err?.message || err);
      }
    }

    mockStore.cases.set(caseId, newCase);

    // Cryptographically audited action
    auditService.log({
      action: 'CASE_INITIALIZATION',
      userId: req.user!.sub,
      userName: req.user!.name,
      badgeNumber: req.user!.badgeNumber,
      ipAddress: req.socket.remoteAddress,
      caseId: newCase.case_id,
      walletAddress: newCase.target_address,
      details: {
        title: newCase.title,
        priority: newCase.priority,
        fraud_type: newCase.fraud_type,
        reported_amount_usd: newCase.reported_amount_usd,
      },
    });

    res.status(201).json({
      success: true,
      data: newCase,
      timestamp: new Date().toISOString(),
    });
  }
);

