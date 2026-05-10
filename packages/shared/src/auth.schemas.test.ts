import { describe, it, expect } from 'vitest';
import { LoginInputSchema } from './auth.schemas.js';

describe('LoginInputSchema', () => {
  it('accepts valid email + password', () => {
    const result = LoginInputSchema.safeParse({ email: 'a@b.co', password: 'pass1234' });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = LoginInputSchema.safeParse({ email: 'a@b.co', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = LoginInputSchema.safeParse({ email: 'not-email', password: 'pass1234' });
    expect(result.success).toBe(false);
  });
});
