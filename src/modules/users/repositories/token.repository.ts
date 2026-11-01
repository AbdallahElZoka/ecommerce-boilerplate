import { prisma } from '../../../shared/database/prisma.js';
import type { TokenType, OneTimeToken } from '@prisma/client';

export class OneTimeTokenRepository {
  async create(data: {
    userId: string;
    tokenHash: string;
    type: TokenType;
    expiresAt: Date;
  }): Promise<OneTimeToken> {
    return prisma.oneTimeToken.create({ data });
  }

  async findValid(hash: string, type: TokenType): Promise<OneTimeToken | null> {
    return prisma.oneTimeToken.findFirst({
      where: {
        tokenHash: hash,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markUsed(id: string): Promise<void> {
    await prisma.oneTimeToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async invalidateAllOfType(userId: string, type: TokenType): Promise<void> {
    await prisma.oneTimeToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  async cleanupExpired(): Promise<number> {
    const result = await prisma.oneTimeToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });
    return result.count;
  }
}

export const oneTimeTokenRepository = new OneTimeTokenRepository();