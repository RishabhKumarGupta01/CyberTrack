/**
 * CryptoTrace Intelligence — Environment Validation & Security Configuration
 * 
 * Enforces strict validation of all runtime configuration parameters.
 * Fails fast on startup if secrets are insecure or missing.
 */

import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env explicitly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1000).max(65535).default(3001),

  // Database URL (Strictly backend)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL: z.coerce.boolean().default(false),

  // Security & Authentication Secrets
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters (256-bit entropy required)'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(16).default(12),

  // Cryptographic evidence integrity signing
  HMAC_SECRET_KEY: z.string().min(32, 'HMAC_SECRET_KEY must be at least 32 characters for FIPS compliance'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = (parsed.error as any).issues || (parsed.error as any).errors || [];
  issues.forEach((err: any) => {
    console.error(` - [${err.path.join('.')}] ${err.message}`);
  });
  throw new Error('Environment validation failed. Aborting startup to protect system security.');
}

export const env = parsed.data;
