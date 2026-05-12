import express from 'express'
import type { Server } from 'socket.io'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  createTournament,
  getTournamentDetail,
  getTournamentResults,
  joinTournament,
  kickTournamentPlayer,
  leaveTournament,
  listOpenTournaments,
  listPublicTournamentsWithLiveTables,
} from '../tournament/tournament.service.js'
import { startTournamentFromDb } from '../tournament/tournament.runtime.service.js'
import {
  emitTournamentKicked,
  emitTournamentLobbyListUpdated,
  emitTournamentRosterUpdated,
} from '../tournament/tournament.roster.events.js'

const router = express.Router()

function getIo(req: express.Request): Server {
  const io = req.app.get('io') as Server | undefined
  if (!io) throw new Error('Socket.IO non initialisé')
  return io
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const body = req.body as Record<string, unknown>
    const visibility = body.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'
    const id = await createTournament({
      hostId: userId,
      name: String(body.name ?? ''),
      visibility,
      joinCode: body.joinCode != null ? String(body.joinCode) : null,
      maxPlayers: Number(body.maxPlayers ?? 8),
      initialStack: Number(body.initialStack ?? 2000),
      startAt: new Date(String(body.startAt ?? Date.now())),
      blindSmall: Number(body.blindSmall ?? 10),
      blindBig: Number(body.blindBig ?? 20),
    })
    const io = req.app.get('io') as Server | undefined
    if (io && visibility === 'PUBLIC') {
      emitTournamentLobbyListUpdated(io)
    }
    res.status(201).json(id)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.get('/', authMiddleware, async (_req, res) => {
  const rows = await listOpenTournaments()
  res.json(rows)
})

router.get('/live-spectate', authMiddleware, async (_req, res) => {
  const rows = await listPublicTournamentsWithLiveTables()
  res.json(rows)
})

router.get('/:id/results', authMiddleware, async (req, res) => {
  const row = await getTournamentResults(req.params.id)
  if (!row) return res.status(404).json({ error: 'Introuvable' })
  res.json(row)
})

router.get('/:id', authMiddleware, async (req, res) => {
  const userId = req.userId ?? null
  const row = await getTournamentDetail(req.params.id, userId)
  if (!row) return res.status(404).json({ error: 'Introuvable' })
  res.json(row)
})

router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const { joined, newBalance } = await joinTournament(
      req.params.id,
      userId,
      (req.body as { code?: string })?.code,
    )
    if (joined) {
      const io = req.app.get('io') as Server | undefined
      if (io) {
        await emitTournamentRosterUpdated(io, req.params.id, { kind: 'join', userId })
      }
    }
    res.json({ ok: true, newBalance })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const { left, newBalance } = await leaveTournament(req.params.id, userId)
    if (left) {
      const io = req.app.get('io') as Server | undefined
      if (io) {
        await emitTournamentRosterUpdated(io, req.params.id, { kind: 'leave', userId })
      }
    }
    res.json({ ok: true, newBalance })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.post('/:id/kick', authMiddleware, async (req, res) => {
  try {
    const hostUserId = req.userId
    if (!hostUserId) return res.status(401).json({ error: 'Non authentifié' })
    const t = await getTournamentDetail(req.params.id, hostUserId)
    if (!t || t.hostId !== hostUserId) {
      return res.status(403).json({ error: 'Réservé à l’hôte' })
    }
    const targetUserId = String((req.body as { userId?: string }).userId ?? '').trim()
    if (!targetUserId) return res.status(400).json({ error: 'userId requis' })
    await kickTournamentPlayer(req.params.id, targetUserId)
    const io = req.app.get('io') as Server | undefined
    if (io) {
      await emitTournamentRosterUpdated(io, req.params.id, {
        kind: 'leave',
        userId: targetUserId,
      })
      emitTournamentKicked(io, targetUserId, req.params.id)
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const t = await getTournamentDetail(req.params.id, userId)
    if (!t || t.hostId !== userId) {
      return res.status(403).json({ error: 'Réservé à l’hôte' })
    }
    const io = getIo(req)
    await startTournamentFromDb(req.params.id, io, { source: 'host' })
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

export default router
