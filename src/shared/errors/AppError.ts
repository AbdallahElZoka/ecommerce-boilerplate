export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'TOKEN_REUSED'
  | 'EMAIL_NOT_VERIFIED'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Insufficient permissions') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new AppError(message, 409, 'CONFLICT');
  }

  static rateLimited(message = 'Too many requests') {
    return new AppError(message, 429, 'RATE_LIMITED');
  }

  static accountLocked(message = 'Account temporarily locked') {
    return new AppError(message, 423, 'ACCOUNT_LOCKED');
  }

  static tokenExpired(message = 'Token has expired') {
    return new AppError(message, 401, 'TOKEN_EXPIRED');
  }

  static tokenInvalid(message = 'Invalid token') {
    return new AppError(message, 401, 'TOKEN_INVALID');
  }

  static tokenReused(message = 'Token reuse detected. All sessions revoked.') {
    return new AppError(message, 401, 'TOKEN_REUSED');
  }

  static emailNotVerified(message = 'Email verification required') {
    return new AppError(message, 403, 'EMAIL_NOT_VERIFIED');
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500, 'INTERNAL_ERROR', undefined, false);
  }
}