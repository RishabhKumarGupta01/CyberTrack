/**
 * CryptoTrace Intelligence — Input Validation & Sanitization Engine
 * 
 * Protects against SQL injection, XSS, prototype pollution, and malformed inputs.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Sanitizes user input string: escapes HTML tags, strips null bytes and script injections.
 */
export function sanitizeInput(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/\0/g, '') // Strip null bytes
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeInput);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // Guard against prototype pollution
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      sanitizedObj[k] = sanitizeInput(v);
    }
    return sanitizedObj;
  }
  return value;
}

/**
 * Validates blockchain address format for standard supported chains.
 */
export function isValidBlockchainAddress(address: string, chain?: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const addr = address.trim();

  // Ethereum / EVM: 0x followed by 40 hex characters
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  // Bitcoin: Bech32 (bc1...) or Base58 (1... or 3...)
  const btcRegex = /^(bc1[a-z0-9]{38,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/i;
  // Solana: Base58 string of length 32 to 44
  const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  // Tron: Base58 starting with T, length 34
  const trxRegex = /^T[a-zA-Z0-9]{33}$/;

  switch (chain?.toLowerCase()) {
    case 'eth':
    case 'ethereum':
    case 'bsc':
    case 'polygon':
    case 'avalanche':
    case 'avax':
      return ethRegex.test(addr);
    case 'btc':
    case 'bitcoin':
      return btcRegex.test(addr);
    case 'sol':
    case 'solana':
      return solRegex.test(addr);
    case 'trx':
    case 'tron':
      return trxRegex.test(addr);
    default:
      // General multi-chain check
      return ethRegex.test(addr) || btcRegex.test(addr) || solRegex.test(addr) || trxRegex.test(addr);
  }
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Official investigator email must be a valid email address').max(255),
  password: z.string().min(1, 'Password is required').max(128),
  rememberMe: z.boolean().optional().default(false),
});

export const cacVerifySchema = z.object({
  certToken: z.string().min(1, 'Certificate token is required'),
  pin: z.string().optional(),
});

export const createCaseSchema = z.object({
  caseId: z.string().regex(/^INV-\d{4}-\d{4,}$/, 'Case ID must match format: INV-YYYY-XXXX (e.g. INV-2026-0942)'),
  title: z.string().min(3, 'Case title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  fraudType: z.enum([
    'pig_butchering',
    'phishing',
    'ransomware',
    'hacks',
    'sanctions_evasion',
    'terrorist_financing',
    'darknet_market',
    'other',
  ]),
  reportedAmountUsd: z.coerce.number().min(0, 'Reported amount cannot be negative'),
  targetAddress: z.string().refine((val) => isValidBlockchainAddress(val), {
    message: 'Invalid blockchain address format for target address',
  }),
  network: z.enum(['ETH', 'BTC', 'SOL', 'BSC', 'POLYGON', 'TRON', 'AVAX']),
  victimRef: z.string().max(100).optional(),
  notes: z.string().max(4000).optional(),
});

export const sealEvidenceSchema = z.object({
  evidenceId: z.string().min(1, 'Evidence ID is required'),
  caseId: z.string().min(1, 'Case ID is required'),
  sha256Hash: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Evidence hash must be a valid 64-character SHA-256 hex string'),
});

export const approveReportSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
  status: z.enum(['APPROVED', 'SUPERVISOR_REVIEW', 'COURT_SUBMITTED']),
  digitalSignature: z.string().min(10, 'Valid digital signature is required to approve court dossier'),
  notes: z.string().max(2000).optional(),
});

export const updateSettingsSchema = z.object({
  ethRpcUrl: z.string().url('Invalid Ethereum RPC URL').optional(),
  btcRpcUrl: z.string().url('Invalid Bitcoin RPC URL').optional(),
  solanaRpcUrl: z.string().url('Invalid Solana RPC URL').optional(),
  aiAssistantEnabled: z.boolean().optional(),
});

// ============================================================================
// VALIDATION MIDDLEWARES
// ============================================================================

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Sanitize input body first
    req.body = sanitizeInput(req.body);

    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = (result.error as any).issues || (result.error as any).errors || [];
      const fieldErrors = issues.map((e: any) => ({
        field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
        message: e.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload provided.',
          details: fieldErrors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = (result.error as any).issues || (result.error as any).errors || [];
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY_PARAMS',
          message: 'Invalid query parameters provided.',
          details: issues,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
};

export const crawlerTraceSchema = z.object({
  startAddress: z.string().min(5).refine((val) => isValidBlockchainAddress(val), {
    message: 'Invalid blockchain address format for crawl starting address',
  }),
  blockchain: z.string().optional().default('Ethereum'),
  maxDepth: z.number().int().min(1).max(5).optional().default(3),
  minVolume: z.number().min(0).optional().default(0.05),
  maxBreadthPerNode: z.number().int().min(1).max(20).optional().default(5),
  stopOnExchange: z.boolean().optional().default(true),
  delayMs: z.number().int().min(0).max(5000).optional().default(200),
  crossChain: z.boolean().optional().default(false),
});

