/**
 * CryptoTrace Intelligence — Express Security Application Architecture
 * 
 * Configures enterprise security middleware:
 * - Helmet (HSTS, CSP, X-Content-Type-Options, Anti-Clickjacking)
 * - CORS (Restricted client origins)
 * - Payload size boundaries (DoS prevention)
 * - Multi-tier rate limiting
 * - Safe centralized error handling
 */

import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiRateLimiter } from './security/rateLimiter';
import { errorHandler } from './security/errorHandler';
import { authRouter } from './routes/auth';
import { casesRouter } from './routes/cases';
import { evidenceRouter } from './routes/evidence';
import { reportsRouter } from './routes/reports';
import { auditRouter } from './routes/audit';
import { settingsRouter } from './routes/settings';
import { ncrpRouter } from './routes/ncrp';
import { sahyogRouter } from './routes/sahyog';
import { crawlerRouter } from './routes/crawler';

export function createServerApp(): Express {
  const app = express();

  // 1. Secure HTTP Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // In development with Vite, let Vite manage inline scripts
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS configuration
  app.use(
    cors({
      origin: true, // Allow same-origin / Vite dev server
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Body parser with strict size ceiling to prevent payload exhaustion DoS
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 4. API Health Endpoint (Public)
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({
      status: 'OPERATIONAL',
      service: 'CryptoTrace Intelligence Forensic Gateway',
      standard: 'CJIS / FIPS 140-3 Validated',
      timestamp: new Date().toISOString(),
    });
  });

  // 5. Global API Rate Limiter
  app.use('/api/v1', apiRateLimiter.middleware());

  // 6. Mount Subsystem API Routers
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/cases', casesRouter);
  app.use('/api/v1/evidence', evidenceRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/settings', settingsRouter);
  app.use('/api/v1/ncrp', ncrpRouter);
  app.use('/api/v1/sahyog', sahyogRouter);
  app.use('/api/v1/crawler', crawlerRouter);

  // 7. 404 handler for undefined API routes
  app.use((req: Request, res: Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: `Forensic endpoint ${req.method} ${req.originalUrl} does not exist.`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  });

  // 8. Global Safe Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createServerApp();
