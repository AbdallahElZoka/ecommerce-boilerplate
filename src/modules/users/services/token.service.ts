import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';
import type { JwtPayload, TokenPair } from '../models/types.js';
import type { Role } from '@prisma/client';

export class TokenService {
  //private readonly accessSecret = env.JWT_ACCESS_SECRET;
  //private readonly refreshSecret = env.JWT_REFRESH_SECRET;
  private readonly accessExpiresIn = env.JWT_ACCESS_EXPIRES_IN;
  private readonly refreshExpiresIn = env.JWT_REFRESH_EXPIRES_IN;

  signAccessToken(payload: Omit<JwtPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      '',
      {
        algorithm: 'HS256',
        expiresIn: this.accessExpiresIn,
      } as jwt.SignOptions
    );
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, '',
         {
        algorithms: ['HS256'],
      }) as JwtPayload;

      if (decoded.type !== 'access') {
        throw AppError.tokenInvalid('Invalid token type');
      }
      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw AppError.tokenExpired();
      }
      if (err instanceof AppError) throw err;
      throw AppError.tokenInvalid();
    }
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  getAccessExpiresInSeconds(): number {
    // Simple parser for "15m", "7d", etc.
    const match = this.accessExpiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 60);
  }

  getRefreshExpiresAt(): Date {
    const match = this.refreshExpiresIn.match(/^(\d+)([smhd])$/);
    let ms = 7 * 24 * 60 * 60 * 1000;
    if (match) {
      const value = parseInt(match[1]!, 10);
      const unit = match[2]!;
      const multipliers: Record<string, number> = {
        s: 1000,
        m: 60_000,
        h: 3_600_000,
        d: 86_400_000,
      };
      ms = value * (multipliers[unit] ?? 86_400_000);
    }
    return new Date(Date.now() + ms);
  }

  createTokenPair(userId: string, role: Role, sessionId: string): TokenPair {
    const accessToken = this.signAccessToken({ sub: userId, role, sid: sessionId });
    const refreshToken = this.generateRefreshToken();
    return {
      accessToken,
      refreshToken,
      expiresIn: this.getAccessExpiresInSeconds(),
    };
  }
}

export const tokenService = new TokenService();