/**
 * Scénario « crash » : round marqué IN_PROGRESS alors que toutes les tables sont COMPLETED —
 * `recoverTournamentsAtBoot` appelle `tryAdvanceRoundAfterTableComplete` (test d’intention sans DB ici :
 * la fonction retourne tôt si des tables ne sont pas terminées).
 */
import { tryAdvanceRoundAfterTableComplete } from '../tournament/tournament.runtime.service.js'

describe('tryAdvanceRoundAfterTableComplete guard', () => {
  it('export est défini (smoke)', () => {
    expect(typeof tryAdvanceRoundAfterTableComplete).toBe('function')
  })
})
