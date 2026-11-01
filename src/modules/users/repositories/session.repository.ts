import { prisma } from '../../../shared/database/prisma.js';
import type { Session } from '@prisma/client';

export class SessionRepository {
  async create(data: {
    userId: string;
    refreshTokenHash: string;
    familyId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<Session> {
    return prisma.session.create({ data });
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    });
  }

  async findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id } });
  }

  async revoke(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async rotate(
    oldSessionId: string,
    newData: {
      refreshTokenHash: string;
      expiresAt: Date;
      userAgent?: string;
      ipAddress?: string;
    }
  ): Promise<Session> {
    // Mark old as revoked and create new in same family
    const old = await prisma.session.findUniqueOrThrow({ where: { id: oldSessionId } });

    const [_, newSession] = await prisma.$transaction([
      prisma.session.update({
        where: { id: oldSessionId },
        data: { revokedAt: new Date() },
      }),
      prisma.session.create({
        data: {
          userId: old.userId,
          familyId: old.familyId,
          refreshTokenHash: newData.refreshTokenHash,
          expiresAt: newData.expiresAt,
          userAgent: newData.userAgent ?? old.userAgent,
          ipAddress: newData.ipAddress ?? old.ipAddress,
        },
      }),
    ]);

    return newSession;
  }

  async touch(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    });
  }

  /** Cleanup expired / revoked sessions (call via cron or startup) */
  async cleanupStale(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { not: null, lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    return result.count;
  }
}

export const sessionRepository = new SessionRepository();