import { describe, it, expect } from 'vitest';
import { LoginInputSchema } from './auth.schemas.js';

describe('LoginInputSchema', () => {
  it('accepts valid username + password', () => {
    const result = LoginInputSchema.safeParse({ username: 'admin', password: 'pass1234' });
    expect(result.success).toBe(true);
  });

  it('rejects short password', () => {
    const result = LoginInputSchema.safeParse({ username: 'admin', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects short username', () => {
    const result = LoginInputSchema.safeParse({ username: 'a', password: 'pass1234' });
    expect(result.success).toBe(false);
  });
});
