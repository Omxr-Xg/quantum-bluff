import express from 'express'
import request from 'supertest'

jest.mock('../middleware/auth.middleware.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(req as express.Request & { userId?: string }).userId = 'user-host'
    next()
  },
}))

const mockCreateTournament = jest.fn()
const mockListOpenTournaments = jest.fn()
const mockListPublicTournamentsWithLiveTables = jest.fn()
const mockGetTournamentDetail = jest.fn()
const mockGetTournamentResults = jest.fn()
const mockJoinTournament = jest.fn()
const mockLeaveTournament = jest.fn()
const mockKickTournamentPlayer = jest.fn()
const mockStartTournamentFromDb = jest.fn()
const mockEmitTournamentRosterUpdated = jest.fn()
const mockEmitTournamentKicked = jest.fn()
const mockEmitTournamentLobbyListUpdated = jest.fn()

jest.mock('../tournament/tournament.roster.events.js', () => ({
  emitTournamentRosterUpdated: (...args: unknown[]) => mockEmitTournamentRosterUpdated(...args),
  emitTournamentKicked: (...args: unknown[]) => mockEmitTournamentKicked(...args),
  emitTournamentLobbyListUpdated: (...args: unknown[]) => mockEmitTournamentLobbyListUpdated(...args),
}))

jest.mock('../tournament/tournament.service.js', () => ({
  createTournament: (...args: unknown[]) => mockCreateTournament(...args),
  listOpenTournaments: (...args: unknown[]) => mockListOpenTournaments(...args),
  listPublicTournamentsWithLiveTables: (...args: unknown[]) =>
    mockListPublicTournamentsWithLiveTables(...args),
  getTournamentDetail: (...args: unknown[]) => mockGetTournamentDetail(...args),
  getTournamentResults: (...args: unknown[]) => mockGetTournamentResults(...args),
  joinTournament: (...args: unknown[]) => mockJoinTournament(...args),
  leaveTournament: (...args: unknown[]) => mockLeaveTournament(...args),
  kickTournamentPlayer: (...args: unknown[]) => mockKickTournamentPlayer(...args),
}))

jest.mock('../tournament/tournament.runtime.service.js', () => ({
  startTournamentFromDb: (...args: unknown[]) => mockStartTournamentFromDb(...args),
}))

import tournamentRoutes from '../routes/tournament.routes.js'

describe('tournament.routes', () => {
  const app = express()
  app.use(express.json())
  const emit = jest.fn()
  const io = {
    to: jest.fn(() => ({ emit })),
  }
  app.set('io', io)
  app.use('/api/tournaments', tournamentRoutes)

  beforeEach(() => {
    mockCreateTournament.mockReset()
    mockListOpenTournaments.mockReset()
    mockListPublicTournamentsWithLiveTables.mockReset()
    mockGetTournamentDetail.mockReset()
    mockGetTournamentResults.mockReset()
    mockJoinTournament.mockReset()
    mockLeaveTournament.mockReset()
    mockKickTournamentPlayer.mockReset()
    mockStartTournamentFromDb.mockReset()
    mockEmitTournamentRosterUpdated.mockReset()
    mockEmitTournamentKicked.mockReset()
    mockEmitTournamentLobbyListUpdated.mockReset()
    emit.mockReset()
    ;(io.to as jest.Mock).mockReset()
    ;(io.to as jest.Mock).mockImplementation(() => ({ emit }))
  })

  it('POST / retourne 201 et { id }', async () => {
    mockCreateTournament.mockResolvedValue({ id: 'tour-1' })
    const res = await request(app)
      .post('/api/tournaments')
      .send({
        name: 'Test',
        visibility: 'PUBLIC',
        maxPlayers: 8,
        initialStack: 2000,
        startAt: new Date(Date.now() + 60_000).toISOString(),
        blindSmall: 10,
        blindBig: 20,
      })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id: 'tour-1' })
    expect(mockCreateTournament).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: 'user-host',
        name: 'Test',
        visibility: 'PUBLIC',
      }),
    )
    expect(mockEmitTournamentLobbyListUpdated).toHaveBeenCalledWith(io)
  })

  it('POST / tournoi PRIVATE ne notifie pas le lobby socket', async () => {
    mockCreateTournament.mockResolvedValue({ id: 'tour-private' })
    const res = await request(app)
      .post('/api/tournaments')
      .send({
        name: 'Priv',
        visibility: 'PRIVATE',
        joinCode: 'secret123',
        maxPlayers: 8,
        initialStack: 2000,
        startAt: new Date(Date.now() + 60_000).toISOString(),
        blindSmall: 10,
        blindBig: 20,
      })
    expect(res.status).toBe(201)
    expect(mockEmitTournamentLobbyListUpdated).not.toHaveBeenCalled()
  })

  it('POST / retourne 400 si createTournament échoue', async () => {
    mockCreateTournament.mockRejectedValue(new Error('Nom requis'))
    const res = await request(app).post('/api/tournaments').send({ name: '' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Nom requis')
  })

  it('GET / retourne la liste', async () => {
    mockListOpenTournaments.mockResolvedValue([{ id: 'a', name: 'X' }])
    const res = await request(app).get('/api/tournaments')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ id: 'a', name: 'X' }])
  })

  it('GET /live-spectate retourne les tournois avec tables en cours', async () => {
    mockListPublicTournamentsWithLiveTables.mockResolvedValue([
      {
        tournamentId: 't-live',
        name: 'Live Cup',
        status: 'ROUND_IN_PROGRESS',
        tables: [{ gameId: 'game_tournament_x', roundNumber: 1, playerCount: 2 }],
      },
    ])
    const res = await request(app).get('/api/tournaments/live-spectate')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].tournamentId).toBe('t-live')
    expect(mockListPublicTournamentsWithLiveTables).toHaveBeenCalled()
  })

  it('GET /:id retourne 404 si introuvable', async () => {
    mockGetTournamentDetail.mockResolvedValue(null)
    const res = await request(app).get('/api/tournaments/unknown-id')
    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
  })

  it('GET /:id/results retourne le classement', async () => {
    mockGetTournamentResults.mockResolvedValue({
      tournamentId: 't1',
      name: 'Cup',
      status: 'COMPLETED',
      leaderboardAvailable: true,
      rows: [
        {
          userId: 'a',
          username: 'Alice',
          finalRank: 1,
          eliminationOrder: null,
          xpAwarded: 500,
          chipsAwarded: 8000,
        },
      ],
    })
    const res = await request(app).get('/api/tournaments/t1/results')
    expect(res.status).toBe(200)
    expect(res.body.leaderboardAvailable).toBe(true)
    expect(res.body.rows).toHaveLength(1)
    expect(mockGetTournamentResults).toHaveBeenCalledWith('t1')
  })

  it('GET /:id/results retourne 404 si inconnu', async () => {
    mockGetTournamentResults.mockResolvedValue(null)
    const res = await request(app).get('/api/tournaments/missing/results')
    expect(res.status).toBe(404)
  })

  it('POST /:id/join appelle le service', async () => {
    mockJoinTournament.mockResolvedValue({ joined: true })
    mockEmitTournamentRosterUpdated.mockResolvedValue(undefined)
    const res = await request(app)
      .post('/api/tournaments/t1/join')
      .send({ code: 'abcd' })
    expect(res.status).toBe(200)
    expect(mockJoinTournament).toHaveBeenCalledWith('t1', 'user-host', 'abcd')
    expect(mockEmitTournamentRosterUpdated).toHaveBeenCalledWith(io, 't1', {
      kind: 'join',
      userId: 'user-host',
    })
  })

  it('POST /:id/join ne diffuse pas le roster si déjà inscrit', async () => {
    mockJoinTournament.mockResolvedValue({ joined: false })
    const res = await request(app)
      .post('/api/tournaments/t1/join')
      .send({ code: 'abcd' })
    expect(res.status).toBe(200)
    expect(mockEmitTournamentRosterUpdated).not.toHaveBeenCalled()
  })

  it('POST /:id/leave appelle le service', async () => {
    mockLeaveTournament.mockResolvedValue({ left: true })
    mockEmitTournamentRosterUpdated.mockResolvedValue(undefined)
    const res = await request(app).post('/api/tournaments/t1/leave').send({})
    expect(res.status).toBe(200)
    expect(mockLeaveTournament).toHaveBeenCalledWith('t1', 'user-host')
    expect(mockEmitTournamentRosterUpdated).toHaveBeenCalledWith(io, 't1', {
      kind: 'leave',
      userId: 'user-host',
    })
  })

  it('POST /:id/kick exclut et notifie le roster + la cible', async () => {
    mockGetTournamentDetail.mockResolvedValue({
      hostId: 'user-host',
      me: { userId: 'user-host' },
    })
    mockKickTournamentPlayer.mockResolvedValue(undefined)
    mockEmitTournamentRosterUpdated.mockResolvedValue(undefined)
    const res = await request(app)
      .post('/api/tournaments/t1/kick')
      .send({ userId: 'player-2' })
    expect(res.status).toBe(200)
    expect(mockKickTournamentPlayer).toHaveBeenCalledWith('t1', 'player-2')
    expect(mockEmitTournamentRosterUpdated).toHaveBeenCalledWith(io, 't1', {
      kind: 'leave',
      userId: 'player-2',
    })
    expect(mockEmitTournamentKicked).toHaveBeenCalledWith(io, 'player-2', 't1')
  })

  it('POST /:id/kick retourne 403 si non hôte', async () => {
    mockGetTournamentDetail.mockResolvedValue({
      hostId: 'other-host',
      me: { userId: 'user-host' },
    })
    const res = await request(app)
      .post('/api/tournaments/t1/kick')
      .send({ userId: 'player-2' })
    expect(res.status).toBe(403)
    expect(mockKickTournamentPlayer).not.toHaveBeenCalled()
  })

  it('POST /:id/start retourne 403 si non hôte', async () => {
    mockGetTournamentDetail.mockResolvedValue({
      hostId: 'other-host',
      me: { userId: 'user-host' },
    })
    const res = await request(app).post('/api/tournaments/t1/start').send({})
    expect(res.status).toBe(403)
    expect(res.body.error).toContain('hôte')
    expect(mockStartTournamentFromDb).not.toHaveBeenCalled()
  })

  it('POST /:id/start retourne 200 pour l’hôte', async () => {
    mockGetTournamentDetail.mockResolvedValue({
      hostId: 'user-host',
      me: { userId: 'user-host' },
    })
    mockStartTournamentFromDb.mockResolvedValue(undefined)
    const res = await request(app).post('/api/tournaments/t1/start').send({})
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(mockStartTournamentFromDb).toHaveBeenCalledWith('t1', io, { source: 'host' })
  })

  it('POST /:id/start retourne 400 si startTournamentFromDb échoue', async () => {
    mockGetTournamentDetail.mockResolvedValue({
      hostId: 'user-host',
      me: { userId: 'user-host' },
    })
    mockStartTournamentFromDb.mockRejectedValue(new Error('Pas assez de joueurs'))
    const res = await request(app).post('/api/tournaments/t1/start').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Pas assez de joueurs')
  })
})
