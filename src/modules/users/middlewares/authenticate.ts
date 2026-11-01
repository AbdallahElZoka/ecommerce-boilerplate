import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/token.service.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../../../shared/errors/AppError.js';
import type { AuthUser } from '../models/types.js';

/**
 * Authenticate middleware – verifies Bearer access token and attaches req.user.
 * Other modules import this via users/index.ts; they never parse JWTs themselves.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid Authorization header');
    }

    const token = header.slice(7);
    const payload = tokenService.verifyAccessToken(token);

    // Re-validate session is still active (supports logout / logout-all)
    const session = await sessionRepository.findById(payload.sid);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw AppError.unauthorized('Session is no longer valid');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw AppError.unauthorized('User no longer exists');
    }

    // Role re-validated from DB, never trusted solely from JWT
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.id,
      emailVerified: !!user.emailVerifiedAt,
    };

    req.user = authUser;
    // Touch session last-used (fire-and-forget)
    void sessionRepository.touch(session.id);

    next();
  } catch (err) {
    next(err);
  }
}