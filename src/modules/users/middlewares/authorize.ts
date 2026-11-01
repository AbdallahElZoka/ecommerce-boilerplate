import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../../../shared/errors/AppError.js';

/**
 * Role-based authorization. Roles are re-checked from the authenticated user
 * (which itself comes from DB), never from client input.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(AppError.forbidden(`Requires one of roles: ${allowedRoles.join(', ')}`));
      return;
    }

    next();
  };
}

/**
 * Ownership helper – ensures the authenticated user owns the resource.
 * Usage: requireOwnership((req) => req.params.userId)
 */
export function requireOwnership(getOwnerId: (req: Request) => string | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    // Admins can access anything
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    const ownerId = getOwnerId(req);
    if (!ownerId || ownerId !== req.user.id) {
      next(AppError.forbidden('You can only access your own resources'));
      return;
    }

    next();
  };
}