/**
 * CryptoTrace Intelligence Platform — Secure Cryptographic JWT Engine
 * 
 * Implements FIPS 140-3 compliant HMAC-SHA256 token issuance and timing-safe verification.
 */

import crypto from 'crypto';
import { env } from '../config/env';
import { AuthTokenPayload, SafeUser } from '../types/security';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export class JwtService {
  private static parseDurationToSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 8 * 3600; // Default 8h
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 8 * 3600;
    }
  }

  /**
   * Generates a signed JWT with expiration and user permissions.
   */
  public static sign(user: SafeUser): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const expiresInSec = this.parseDurationToSeconds(env.JWT_EXPIRES_IN);

    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      badgeNumber: user.badgeNumber,
      role: user.role,
      agency: user.agency,
      permissions: user.permissions,
      iat: now,
      exp: now + expiresInSec,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(dataToSign)
      .digest();

    const encodedSignature = signature
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${dataToSign}.${encodedSignature}`;
  }

  /**
   * Verifies token signature using timing-safe comparison and checks expiration.
   */
  public static verify(token: string): AuthTokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(dataToVerify)
      .digest();

    let actualSignature: Buffer;
    try {
      let base64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      actualSignature = Buffer.from(base64, 'base64');
    } catch {
      return null;
    }

    if (expectedSignature.length !== actualSignature.length) {
      return null;
    }

    // Cryptographic timing-safe comparison to prevent side-channel timing attacks
    const isValidSignature = crypto.timingSafeEqual(expectedSignature, actualSignature);
    if (!isValidSignature) return null;

    try {
      const payload: AuthTokenPayload = JSON.parse(base64UrlDecode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);

      // Verify expiration
      if (payload.exp && payload.exp < now) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
