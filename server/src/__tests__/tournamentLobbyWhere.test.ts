import { describe, expect, it } from '@jest/globals'
import {
  buildTournamentLobbyWhere,
  TOURNAMENT_LIST_GRACE_MS_DEFAULT,
} from '../tournament/tournamentLobbyWhere.js'

describe('buildTournamentLobbyWhere', () => {
  const now = new Date('2026-05-10T12:00:00.000Z')

  it('exige la visibilité PUBLIC pour un visiteur non connecté', () => {
    const w = buildTournamentLobbyWhere({
      now,
      graceMs: TOURNAMENT_LIST_GRACE_MS_DEFAULT,
      currentUserId: null,
    })
    expect(w.AND).toBeDefined()
    const and = w.AND as unknown[]
    expect(and[1]).toMatchObject({ visibility: 'PUBLIC' })
  })

  it('autorise PRIVATE pour le créateur dans le second bloc OR', () => {
    const w = buildTournamentLobbyWhere({
      now,
      graceMs: TOURNAMENT_LIST_GRACE_MS_DEFAULT,
      currentUserId: 'user-1',
    })
    const vis = (w.AND as unknown[])[1] as { OR: unknown[] }
    expect(vis.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ visibility: 'PRIVATE', createdById: 'user-1' }),
      ]),
    )
  })

  it('inclut ACTIVE récent (avec borne startTime) dans le filtre temporel', () => {
    const w = buildTournamentLobbyWhere({
      now,
      graceMs: TOURNAMENT_LIST_GRACE_MS_DEFAULT,
      currentUserId: null,
    })
    const temporal = (w.AND as unknown[])[0] as { OR: Record<string, unknown>[] }
    const activeBranch = temporal.OR.find((x) => x.status === 'ACTIVE')
    expect(activeBranch).toMatchObject({
      status: 'ACTIVE',
      startTime: { gte: expect.any(Date) },
    })
  })
})
