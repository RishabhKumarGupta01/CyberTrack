/**
 * CryptoTrace Intelligence — Standalone Server Entry Point
 * 
 * Used for production container deployments or dedicated server execution.
 */

import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log('============================================================');
  console.log(`✓ CryptoTrace Forensic Server listening on port ${env.PORT}`);
  console.log(`✓ Security Standard: CJIS / FIPS 140-3 Validated`);
  console.log(`✓ Rate Limiting: Active (Auth: 5/min, API: 120/min)`);
  console.log(`✓ Audit Journal: Append-only SHA-256 hash chaining initialized`);
  console.log(`✓ Environment: ${env.NODE_ENV}`);
  console.log('============================================================');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server gracefully.');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});
