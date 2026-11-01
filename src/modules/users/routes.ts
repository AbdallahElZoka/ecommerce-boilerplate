import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './controllers/auth.controller.js';
import { usersController } from './controllers/users.controller.js';
import { authenticate } from './middlewares/authenticate.js';
import { authorize } from './middlewares/authorize.js';
import { validate } from '../../shared/middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './models/schemas.js';
import { env } from '../../config/env.js';

const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' },
  },
});

export function createUsersRouter(): Router {
  const router = Router();

  // ── Public auth routes ──────────────────────────────────────────
  router.post(
    '/auth/register',
    authLimiter,
    validate(registerSchema),
    (req, res, next) => authController.register(req, res, next)
  );

  router.post(
    '/auth/login',
    authLimiter,
    validate(loginSchema),
    (req, res, next) => authController.login(req, res, next)
  );

  router.post(
    '/auth/refresh',
    authLimiter,
    (req, res, next) => authController.refresh(req, res, next)
  );

  router.post(
    '/auth/verify-email',
    validate(verifyEmailSchema),
    (req, res, next) => authController.verifyEmail(req, res, next)
  );

  router.post(
    '/auth/forgot-password',
    authLimiter,
    validate(forgotPasswordSchema),
    (req, res, next) => authController.forgotPassword(req, res, next)
  );

  router.post(
    '/auth/reset-password',
    validate(resetPasswordSchema),
    (req, res, next) => authController.resetPassword(req, res, next)
  );

  // ── Protected auth routes ───────────────────────────────────────
  router.post(
    '/auth/logout',
    authenticate,
    (req, res, next) => authController.logout(req, res, next)
  );

  router.post(
    '/auth/logout-all',
    authenticate,
    (req, res, next) => authController.logoutAll(req, res, next)
  );

  // ── User profile ────────────────────────────────────────────────
  router.get(
    '/users/me',
    authenticate,
    (req, res, next) => usersController.me(req, res, next)
  );

  // ── Sample admin route ──────────────────────────────────────────
  router.get(
    '/admin/ping',
    authenticate,
    authorize('ADMIN'),
    (req, res) => usersController.adminPing(req, res)
  );

  return router;
}