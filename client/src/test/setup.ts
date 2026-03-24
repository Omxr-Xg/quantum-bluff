import { vi } from 'vitest';

// Mock des assets si nécessaire
vi.mock('../assets/logo', () => ({
  logoDataUrl: 'data:image/svg+xml,mocked-logo',
  defaultAvatarUrl: 'data:image/svg+xml,mocked-avatar'
}));
