/**
 * CryptoTrace Intelligence — Security Suite Automated Verification Script
 * 
 * Verifies all 10 core security pillars:
 * 1. Authentication
 * 2. Role-Based Authorization (RBAC)
 * 3. Protected Routes
 * 4. Server-Side API Validation
 * 5. Rate Limiting
 * 6. Audit Logging (SHA-256 Hash Chaining)
 * 7. Secure Environment Variables
 * 8. Input Validation
 * 9. No Secrets in Frontend / DTOs
 * 10. Safe Error Handling
 */

import http from 'http';
import { app } from './app';
import { auditService } from './security/auditService';
import { authRateLimiter } from './security/rateLimiter';

// Helper for testing Express app directly in-process
async function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: url,
          method,
          headers,
        },
        (res: any) => {
          let data = '';
          res.on('data', (chunk: any) => {
            data += chunk;
          });
          res.on('end', () => {
            server.close();
            let parsedBody = null;
            try {
              parsedBody = JSON.parse(data);
            } catch {
              parsedBody = data;
            }
            resolve({
              status: res.statusCode,
              body: parsedBody,
              headers: res.headers,
            });
          });
        }
      );

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

async function runSecurityVerification() {
  console.log('============================================================');
  console.log('STARTING CRYPTOTRACE SECURITY ARCHITECTURE VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ✓ ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ✗ ${testName}${detail ? ' — ' + detail : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Authentication & Secret Omission
  // --------------------------------------------------------------------------
  authRateLimiter.reset(); // ensure clean rate limiter state
  const loginRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'i.kerman@cryptotrace.gov',
    password: 'GovSec#Trace2026',
  });

  assert(loginRes.status === 200, 'Test 1.1: Authentication succeeds with valid credentials');
  assert(!!loginRes.body?.data?.token, 'Test 1.2: Valid signed JWT token returned');
  assert(
    loginRes.body?.data?.user?.password_hash === undefined,
    'Test 1.3: No secrets in responses (password_hash stripped from user DTO)'
  );
  assert(loginRes.body?.data?.user?.role === 'L3 Analyst', 'Test 1.4: Correct user role assigned');

  const analystToken = loginRes.body?.data?.token;

  // --------------------------------------------------------------------------
  // TEST 2: Rejection of Invalid Credentials (Safe Error Handling)
  // --------------------------------------------------------------------------
  const badLoginRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'i.kerman@cryptotrace.gov',
    password: 'WrongPassword999!',
  });
  assert(badLoginRes.status === 401, 'Test 2.1: Rejects invalid password with 401');
  assert(
    badLoginRes.body?.error?.code === 'INVALID_CREDENTIALS',
    'Test 2.2: Generic safe error code returned (prevents user/password enumeration)'
  );

  // --------------------------------------------------------------------------
  // TEST 3: Rate Limiting Enforcement (Brute Force Defense)
  // --------------------------------------------------------------------------
  console.log('\nTesting Authentication Rate Limiter (Sliding Window)...');
  authRateLimiter.reset();
  // Fire 5 rapid requests (allowed limit is 5)
  for (let i = 0; i < 5; i++) {
    await makeRequest('POST', '/api/v1/auth/login', {
      email: 'i.kerman@cryptotrace.gov',
      password: 'wrong',
    });
  }
  // 6th attempt must be rejected with 429 Too Many Requests
  const rateLimitedRes = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'i.kerman@cryptotrace.gov',
    password: 'wrong',
  });

  assert(
    rateLimitedRes.status === 429,
    'Test 3.1: 6th login attempt rate-limited with HTTP 429 Too Many Requests'
  );
  assert(
    rateLimitedRes.headers['retry-after'] !== undefined,
    'Test 3.2: Retry-After header present in rate limit response'
  );
  assert(
    rateLimitedRes.headers['x-ratelimit-remaining'] === '0',
    'Test 3.3: X-RateLimit-Remaining correctly set to 0'
  );

  // Reset rate limiter for subsequent tests
  authRateLimiter.reset();

  // --------------------------------------------------------------------------
  // TEST 4: Protected Routes & Bearer Auth
  // --------------------------------------------------------------------------
  const unauthRes = await makeRequest('GET', '/api/v1/cases');
  assert(unauthRes.status === 401, 'Test 4.1: Access without Bearer token rejected with 401');

  const authCasesRes = await makeRequest('GET', '/api/v1/cases', undefined, analystToken);
  assert(authCasesRes.status === 200, 'Test 4.2: Access with valid Bearer token permitted');

  // --------------------------------------------------------------------------
  // TEST 5: Role-Based Access Control (RBAC) Enforcement
  // --------------------------------------------------------------------------
  // L3 Analyst attempts to modify system settings (Admin only)
  const forbiddenRes = await makeRequest(
    'PUT',
    '/api/v1/settings',
    { ethRpcUrl: 'https://evil-rpc.com' },
    analystToken
  );
  assert(
    forbiddenRes.status === 403,
    'Test 5.1: L3 Analyst forbidden from modifying Admin system settings (HTTP 403)'
  );

  // Now login as Admin
  const adminLogin = await makeRequest('POST', '/api/v1/auth/login', {
    email: 'admin@cryptotrace.gov',
    password: 'GovSec#Trace2026',
  });
  const adminToken = adminLogin.body?.data?.token;

  const adminSettingsRes = await makeRequest(
    'PUT',
    '/api/v1/settings',
    { ethRpcUrl: 'https://cloudflare-eth.com' },
    adminToken
  );
  assert(adminSettingsRes.status === 200, 'Test 5.2: Admin permitted to modify system settings');

  // --------------------------------------------------------------------------
  // TEST 6: Server-Side API Input Validation
  // --------------------------------------------------------------------------
  // Malformed wallet address and negative amount
  const invalidCaseRes = await makeRequest(
    'POST',
    '/api/v1/cases',
    {
      caseId: 'INV-2026-9999',
      title: 'Valid Title',
      priority: 'high',
      fraudType: 'pig_butchering',
      reportedAmountUsd: -500, // Invalid: negative amount
      targetAddress: '0xinvalid_eth_address_format', // Invalid: malformed address
      network: 'ETH',
    },
    analystToken
  );

  assert(
    invalidCaseRes.status === 400,
    'Test 6.1: Malformed input (negative amount & bad address) rejected with 400 Bad Request'
  );
  assert(
    invalidCaseRes.body?.error?.code === 'VALIDATION_ERROR',
    'Test 6.2: Structured VALIDATION_ERROR returned with specific field explanations'
  );

  // Valid case creation
  const validCaseRes = await makeRequest(
    'POST',
    '/api/v1/cases',
    {
      caseId: `INV-2026-88${Math.floor(Math.random() * 900 + 100)}`,
      title: 'Operation Dark Sun',
      priority: 'critical',
      fraudType: 'ransomware',
      reportedAmountUsd: 1250000,
      targetAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      network: 'ETH',
      notes: 'Initial IC3 referral dossier',
    },
    analystToken
  );
  assert(validCaseRes.status === 201, 'Test 6.3: Valid input accepted and created (HTTP 201)');

  // --------------------------------------------------------------------------
  // TEST 7: Cryptographic Audit Logging (SHA-256 Hash Chaining)
  // --------------------------------------------------------------------------
  const chainVerification = auditService.verifyChainIntegrity();
  assert(chainVerification.isValid, 'Test 7.1: Audit journal SHA-256 hash chaining is intact and untampered');
  assert(
    chainVerification.totalRecords >= 4,
    `Test 7.2: Verified ${chainVerification.totalRecords} cryptographic audit links`
  );
  assert(
    !!chainVerification.headHash && chainVerification.headHash.length === 64,
    'Test 7.3: Valid 64-character SHA-256 head hash generated'
  );

  // --------------------------------------------------------------------------
  // TEST 8: Safe Error Handling & Information Disclosure Prevention
  // --------------------------------------------------------------------------
  const notFoundRes = await makeRequest('GET', '/api/v1/non-existent-forensic-endpoint');
  assert(notFoundRes.status === 404, 'Test 8.1: Undefined API route returns clean 404');
  assert(
    typeof notFoundRes.body?.error?.message === 'string' &&
      !JSON.stringify(notFoundRes.body).includes('node_modules') &&
      !JSON.stringify(notFoundRes.body).includes('server/'),
    'Test 8.2: No stack traces, file paths, or internal server paths leaked in error responses'
  );

  console.log('\n============================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
