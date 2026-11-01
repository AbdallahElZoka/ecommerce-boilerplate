import crypto from 'node:crypto';
import { passwordService } from './password.service.js';
import { tokenService } from './token.service.js';
import { emailService } from './email.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { oneTimeTokenRepository } from '../repositories/token.repository.js';
import { AppError } from '../../../shared/errors/AppError.js';
import type { RegisterInput, LoginInput } from '../models/schemas.js';
import type { TokenPair, UserProfile } from '../models/types.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: UserProfile; message: string }> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      // Do not reveal that the email is taken (anti-enumeration)
      // Still return success-like response, but no email is sent for existing
      return {
        user: await userRepository.toProfile(existing),
        message: 'If this email is new, a verification link has been sent.',
      };
    }

    const passwordHash = await passwordService.hash(input.password);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    // Issue verification token
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = tokenService.hashToken(rawToken);
    await oneTimeTokenRepository.create({
      userId: user.id,
      tokenHash,
      type: 'EMAIL_VERIFICATION',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await emailService.sendVerificationEmail(user.email, rawToken);

    return {
      user: await userRepository.toProfile(user),
      message: 'Registration successful. Please verify your email.',
    };
  }

  async login(
    input: LoginInput,
    meta: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<{ tokens: TokenPair; user: UserProfile }> {
    const user = await userRepository.findByEmail(input.email);

    // Constant-time-ish response for non-existent users
    if (!user) {
      await passwordService.hash('dummy-password-to-equalize-timing');
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw AppError.accountLocked(
        `Account locked until ${user.lockedUntil.toISOString()}. Try again later.`
      );
    }

    const valid = await passwordService.verify(user.passwordHash, input.password);
    if (!valid) {
      const updated = await userRepository.incrementFailedLogins(user.id);
      if (updated.failedLogins >= MAX_FAILED_LOGINS) {
        await userRepository.lockAccount(
          user.id,
          new Date(Date.now() + LOCK_DURATION_MS)
        );
        throw AppError.accountLocked('Too many failed attempts. Account temporarily locked.');
      }
      throw AppError.unauthorized('Invalid email or password');
    }

    await userRepository.resetFailedLogins(user.id);

    // Create session + tokens
    const familyId = crypto.randomUUID();
    const rawRefresh = tokenService.generateRefreshToken();
    const refreshHash = tokenService.hashToken(rawRefresh);
    const expiresAt = tokenService.getRefreshExpiresAt();

    const session = await sessionRepository.create({
      userId: user.id,
      refreshTokenHash: refreshHash,
      familyId,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const tokens = tokenService.createTokenPair(user.id, user.role, session.id);
    // Override refresh with the one we stored
    tokens.refreshToken = rawRefresh;

    return {
      tokens,
      user: await userRepository.toProfile(user),
    };
  }

  async refresh(
    rawRefreshToken: string,
    meta: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<TokenPair> {
    const hash = tokenService.hashToken(rawRefreshToken);
    const session = await sessionRepository.findByRefreshTokenHash(hash);

    if (!session) {
      throw AppError.tokenInvalid('Invalid refresh token');
    }

    // Reuse detection: token already revoked → possible theft
    if (session.revokedAt) {
      await sessionRepository.revokeFamily(session.familyId);
      throw AppError.tokenReused();
    }

    if (session.expiresAt < new Date()) {
      await sessionRepository.revoke(session.id);
      throw AppError.tokenExpired('Refresh token has expired');
    }

    const user = await userRepository.findById(session.userId);
    if (!user) {
      throw AppError.unauthorized('User no longer exists');
    }

    // Rotate
    const newRawRefresh = tokenService.generateRefreshToken();
    const newHash = tokenService.hashToken(newRawRefresh);
    const newExpires = tokenService.getRefreshExpiresAt();

    const newSession = await sessionRepository.rotate(session.id, {
      refreshTokenHash: newHash,
      expiresAt: newExpires,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const tokens = tokenService.createTokenPair(user.id, user.role, newSession.id);
    tokens.refreshToken = newRawRefresh;
    return tokens;
  }

  async logout(sessionId: string): Promise<void> {
    await sessionRepository.revoke(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await sessionRepository.revokeAllForUser(userId);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const hash = tokenService.hashToken(rawToken);
    const record = await oneTimeTokenRepository.findValid(hash, 'EMAIL_VERIFICATION');
    if (!record) {
      throw AppError.tokenInvalid('Invalid or expired verification token');
    }

    await oneTimeTokenRepository.markUsed(record.id);
    await userRepository.markEmailVerified(record.userId);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email);

    // Always same response (anti-enumeration)
    const message =
      'If an account exists for this email, a password reset link has been sent.';

    if (!user) {
      return { message };
    }

    // Invalidate previous reset tokens
    await oneTimeTokenRepository.invalidateAllOfType(user.id, 'PASSWORD_RESET');

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const tokenHash = tokenService.hashToken(rawToken);
    await oneTimeTokenRepository.create({
      userId: user.id,
      tokenHash,
      type: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    await emailService.sendPasswordResetEmail(user.email, rawToken);
    return { message };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const hash = tokenService.hashToken(rawToken);
    const record = await oneTimeTokenRepository.findValid(hash, 'PASSWORD_RESET');
    if (!record) {
      throw AppError.tokenInvalid('Invalid or expired reset token');
    }

    passwordService.assertStrong(newPassword);
    const passwordHash = await passwordService.hash(newPassword);

    await oneTimeTokenRepository.markUsed(record.id);
    await userRepository.updatePassword(record.userId, passwordHash);
    // Security: revoke all sessions after password change
    await sessionRepository.revokeAllForUser(record.userId);
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    return userRepository.toProfile(user);
  }
}

export const authService = new AuthService();