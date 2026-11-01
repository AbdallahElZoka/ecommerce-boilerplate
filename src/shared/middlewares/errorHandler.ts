import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { env } from '../../config/env.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten().fieldErrors,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Operational AppErrors
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unexpected errors
  console.error('[UNHANDLED_ERROR]', err);

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message || 'Internal server error',
    },
  };
  res.status(500).json(response);
}

export function notFoundHandler(_req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  };
  res.status(404).json(response);
}