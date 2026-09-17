/**
 * CryptoTrace Intelligence — Safe Centralized Error Handling Middleware
 * 
 * Prevents information disclosure: NEVER leaks internal stack traces,
 * database errors, SQL syntax, or file paths to the client.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED');

  // Securely log complete error details and stack trace internally on server
  console.error(`[SECURITY ERROR LOG] [${incidentId}] ${req.method} ${req.originalUrl}:`, {
    message: err.message,
    code: errorCode,
    statusCode,
    user: req.user?.email || 'unauthenticated',
    ip: req.socket.remoteAddress,
    stack: err.stack,
  });

  // Client-safe response: NEVER expose err.stack or database internals
  const safeMessage = statusCode === 500
    ? 'An unexpected system error occurred. This incident has been logged for security review.'
    : err.message || 'Request processing failed.';

  res.status(statusCode).json({
    success: false,
    error: {
      incidentId,
      code: errorCode,
      message: safeMessage,
      ...(err.details ? { details: err.details } : {}),
    },
    timestamp: new Date().toISOString(),
  });
};
