import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../models/schemas.js';
import { env } from '../../../config/env.js';
import type { ApiResponse } from '../../../shared/middlewares/errorHandler.js';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/api/v1/auth',
  });
}

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as RegisterInput;
      const result = await authService.register(input);
      const response: ApiResponse = {
        success: true,
        data: { user: result.user, message: result.message },
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as LoginInput;
      const meta = {
        userAgent: req.get('user-agent') ?? undefined,
        ipAddress: req.ip,
      };
      const { tokens, user } = await authService.login(input, meta);

      // Web clients: set httpOnly cookie. Mobile clients read body.
      setRefreshCookie(res, tokens.refreshToken);

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken, // mobile can use this
          expiresIn: tokens.expiresIn,
          user,
        },
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Prefer cookie (web), fall back to body (mobile)
      const raw =
        (req.cookies?.refreshToken as string | undefined) ||
        (req.body?.refreshToken as string | undefined);

      if (!raw) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Refresh token required' },
        });
        return;
      }

      const meta = {
        userAgent: req.get('user-agent') ?? undefined,
        ipAddress: req.ip,
      };
      const tokens = await authService.refresh(raw, meta);

      setRefreshCookie(res, tokens.refreshToken);

      const response: ApiResponse = {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.sessionId) {
        await authService.logout(req.user.sessionId);
      }
      clearRefreshCookie(res);
      res.json({ success: true, data: { message: 'Logged out' } });
    } catch (err) {
      next(err);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.id) {
        await authService.logoutAll(req.user.id);
      }
      clearRefreshCookie(res);
      res.json({ success: true, data: { message: 'All sessions revoked' } });
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body as VerifyEmailInput;
      await authService.verifyEmail(token);
      res.json({
        success: true,
        data: { message: 'Email verified successfully' },
      });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as ForgotPasswordInput;
      const result = await authService.forgotPassword(email);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body as ResetPasswordInput;
      await authService.resetPassword(token, password);
      res.json({
        success: true,
        data: { message: 'Password reset successful. Please log in again.' },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();