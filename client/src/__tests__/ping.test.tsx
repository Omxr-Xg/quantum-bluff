/**
 * =============================================================================
 * PING.TEST.TSX — Contrôle de santé du frontend
 * =============================================================================
 *
 * Test minimal pour vérifier que l’environnement de test Vitest et le bundle
 * client fonctionnent. Si ce test passe, on peut exécuter la suite complète.
 *
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';

describe('Frontend health check', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });
});