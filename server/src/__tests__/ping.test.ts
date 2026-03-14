/**
 * =============================================================================
 * PING.TEST.TS — Contrôle de santé du backend
 * =============================================================================
 *
 * Test minimal pour vérifier que Jest et l’environnement Node du serveur
 * fonctionnent. Si ce test passe, la suite complète peut s’exécuter.
 *
 * =============================================================================
 */

describe('Backend health check', () => {
  it('should pass basic test', () => {
    expect(2 + 2).toBe(4);
  });
});