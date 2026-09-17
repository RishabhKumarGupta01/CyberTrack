/**
 * CryptoTrace Intelligence Platform — Client-Side Security Utilities
 * 
 * Provides robust input sanitization, address format verification, and safe error formatting.
 */

import { ApiError } from '../services/api';

/**
 * Validates format for standard supported blockchain addresses.
 */
export function validateBlockchainAddress(address: string, chain?: string): { isValid: boolean; message?: string } {
  if (!address || typeof address !== 'string') {
    return { isValid: false, message: 'Address cannot be empty.' };
  }
  const clean = address.trim();

  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  const btcRegex = /^(bc1[a-z0-9]{38,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/i;
  const solRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  const trxRegex = /^T[a-zA-Z0-9]{33}$/;

  const lowerChain = chain?.toLowerCase() || '';

  if (lowerChain.includes('eth') || lowerChain.includes('bsc') || lowerChain.includes('polygon') || lowerChain.includes('avax')) {
    if (!ethRegex.test(clean)) {
      return { isValid: false, message: 'Invalid Ethereum/EVM format (must start with 0x and have 40 hex chars).' };
    }
  } else if (lowerChain.includes('btc') || lowerChain.includes('bitcoin')) {
    if (!btcRegex.test(clean)) {
      return { isValid: false, message: 'Invalid Bitcoin address format (must be Bech32 bc1... or Base58 1.../3...).' };
    }
  } else if (lowerChain.includes('sol')) {
    if (!solRegex.test(clean)) {
      return { isValid: false, message: 'Invalid Solana address format (must be Base58 32-44 characters).' };
    }
  } else if (lowerChain.includes('tron') || lowerChain.includes('trx')) {
    if (!trxRegex.test(clean)) {
      return { isValid: false, message: 'Invalid Tron address format (must start with T and be 34 characters).' };
    }
  } else {
    // Multi-chain check
    const anyValid = ethRegex.test(clean) || btcRegex.test(clean) || solRegex.test(clean) || trxRegex.test(clean);
    if (!anyValid) {
      return { isValid: false, message: 'Unrecognized blockchain address format.' };
    }
  }

  return { isValid: true };
}

/**
 * Validates forensic case identifier format (INV-YYYY-XXXX).
 */
export function validateCaseId(caseId: string): { isValid: boolean; message?: string } {
  if (!caseId || !caseId.trim()) {
    return { isValid: false, message: 'Case ID is required.' };
  }
  const regex = /^INV-\d{4}-\d{4,}$/;
  if (!regex.test(caseId.trim())) {
    return { isValid: false, message: 'Case ID must match format: INV-YYYY-XXXX (e.g. INV-2026-0942).' };
  }
  return { isValid: true };
}

/**
 * Sanitizes user input against XSS and injection.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * Safely masks confidential tokens/keys for UI display.
 */
export function maskSecret(secret?: string, visibleChars = 4): string {
  if (!secret) return '••••••••••••••••';
  if (secret.length <= visibleChars * 2) return '••••••••';
  return `${secret.slice(0, visibleChars)}••••••••${secret.slice(-visibleChars)}`;
}

/**
 * Formats API errors safely for user presentation.
 */
export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return err.retryAfterSeconds
        ? `Rate limit exceeded. Please wait ${err.retryAfterSeconds}s before retrying.`
        : err.message;
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected security event occurred.';
}
