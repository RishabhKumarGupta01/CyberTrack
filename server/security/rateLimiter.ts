/**
 * CryptoTrace Intelligence — Sliding-Window Rate Limiting Engine
 * 
 * Mitigates brute-force attacks on authentication endpoints and protects
 * backend analysis endpoints from denial-of-service or query flooding.
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max allowed requests in windowMs
  message: string;
}

interface ClientTracker {
  timestamps: number[];
}

export class RateLimiter {
  private clients = new Map<string, ClientTracker>();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Periodic sweep to prevent memory leak
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [ip, tracker] of this.clients.entries()) {
        tracker.timestamps = tracker.timestamps.filter((t) => now - t < this.config.windowMs);
        if (tracker.timestamps.length === 0) {
          this.clients.delete(ip);
        }
      }
    }, Math.max(config.windowMs, 60000));

    // Allow node process to exit cleanly if this timer is active
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const ip = this.getClientIp(req);
      const now = Date.now();

      let tracker = this.clients.get(ip);
      if (!tracker) {
        tracker = { timestamps: [] };
        this.clients.set(ip, tracker);
      }

      // Filter timestamps within the current sliding window
      tracker.timestamps = tracker.timestamps.filter((t) => now - t < this.config.windowMs);

      const remaining = Math.max(0, this.config.max - tracker.timestamps.length);
      const oldestTimestamp = tracker.timestamps[0] || now;
      const resetTimeSec = Math.ceil((oldestTimestamp + this.config.windowMs - now) / 1000);

      // Set standard RFC-compliant rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', Math.max(1, resetTimeSec));

      if (tracker.timestamps.length >= this.config.max) {
        res.setHeader('Retry-After', Math.max(1, resetTimeSec));
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: this.config.message,
            retryAfterSeconds: Math.max(1, resetTimeSec),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Record this hit
      tracker.timestamps.push(now);
      next();
    };
  }

  /**
   * Helper to manually reset limits (e.g. in test suites)
   */
  public reset(): void {
    this.clients.clear();
  }
}

/**
 * 1. Auth Rate Limiter: Maximum 5 login attempts per 60 seconds per IP
 * Specifically targets credential stuffing and password brute-forcing.
 */
export const authRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts. Please wait 60 seconds before retrying.',
});

/**
 * 2. General API Rate Limiter: Maximum 120 requests per 60 seconds per IP
 */
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'API rate limit exceeded. Please slow down your requests.',
});

/**
 * 3. Report / Evidence Export Rate Limiter: Maximum 10 exports per 60 seconds per IP
 */
export const exportRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Dossier and evidence export rate limit exceeded. Please wait before generating further exports.',
});
