import { prisma } from '../../../shared/database/prisma.js';
import type { Role, User } from '@prisma/client';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role?: Role;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? 'CUSTOMER',
      },
    });
  }

  async markEmailVerified(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, failedLogins: 0, lockedUntil: null },
    });
  }

  async incrementFailedLogins(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLogins: { increment: 1 } },
    });
  }

  async resetFailedLogins(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLogins: 0, lockedUntil: null },
    });
  }

  async lockAccount(userId: string, until: Date): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: until },
    });
  }

  async toProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }
}

export const userRepository = new UserRepository();