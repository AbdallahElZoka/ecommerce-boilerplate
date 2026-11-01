import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
} from '../src/modules/users/models/schemas.js';

describe('Auth Zod schemas', () => {
  it('rejects weak passwords on register', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('accepts strong password', () => {
    const result = registerSchema.safeParse({
      email: 'Test@Example.com',
      password: 'StrongPass1',
      firstName: 'Ada',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com'); // lowercased
    }
  });

  it('login requires email + password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('reset password enforces policy', () => {
    expect(
      resetPasswordSchema.safeParse({ token: 'abc', password: 'short' }).success
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ token: 'abc', password: 'GoodPass9' }).success
    ).toBe(true);
  });
});