import type { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string; // userId
  role: Role;
  sid: string; // sessionId
  type: 'access';
}

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  sessionId: string;
  emailVerified: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}