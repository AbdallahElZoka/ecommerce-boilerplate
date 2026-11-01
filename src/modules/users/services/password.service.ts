import argon2 from 'argon2';
import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors/AppError.js';

export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  };

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  assertStrong(password: string): void {
    // Extra defense-in-depth beyond Zod
    if (password.length < 8) {
      throw AppError.badRequest('Password is too short');
    }
  }
}

export const passwordService = new PasswordService();