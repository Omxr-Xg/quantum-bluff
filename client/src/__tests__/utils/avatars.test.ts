/**
 * =============================================================================
 * AVATARS.TEST.TS — Tests du module avatars
 * =============================================================================
 *
 * Teste getPlayerAvatar() qui retourne une URL d’avatar ou une chaîne vide.
 * Comportement actuel : toujours une chaîne vide (placeholder pour future intégration).
 *
 * Tous les tests sont commentés de A à Z.
 * =============================================================================
 */

import { describe, it, expect } from 'vitest';
import { getPlayerAvatar } from '../../utils/avatars';

describe('getPlayerAvatar', () => {
  it('retourne une chaîne (pas undefined/null) pour un nom donné', () => {
    const result = getPlayerAvatar('Alice');
    expect(typeof result).toBe('string');
  });

  it('retourne une chaîne vide pour l’instant (implémentation placeholder)', () => {
    expect(getPlayerAvatar('Bob')).toBe('');
    expect(getPlayerAvatar('')).toBe('');
  });

  it('accepte n’importe quelle chaîne sans lever', () => {
    expect(() => getPlayerAvatar('User123')).not.toThrow();
  });
});
