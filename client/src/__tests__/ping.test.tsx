import { describe, it, expect } from 'vitest';

describe('Frontend health check', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });
});