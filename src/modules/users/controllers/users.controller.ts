import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import type { ApiResponse } from '../../../shared/middlewares/errorHandler.js';

export class UsersController {
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
        return;
      }
      const profile = await authService.getProfile(req.user.id);
      const response: ApiResponse = { success: true, data: profile };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }

  async adminPing(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        message: 'Admin access confirmed',
        userId: req.user?.id,
        role: req.user?.role,
      },
    });
  }
}

export const usersController = new UsersController();