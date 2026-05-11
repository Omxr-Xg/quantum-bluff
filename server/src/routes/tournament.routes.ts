import express from 'express'
import type { Server } from 'socket.io'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  createTournament,
  getTournamentDetail,
  joinTournament,
  leaveTournament,
  listOpenTournaments,
} from '../tournament/tournament.service.js'
import { startTournamentFromDb } from '../tournament/tournament.runtime.service.js'

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
    const id = await createTournament({
      hostId: userId,
      name: String(body.name ?? ''),
      visibility: body.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      joinCode: body.joinCode != null ? String(body.joinCode) : null,
      maxPlayers: Number(body.maxPlayers ?? 8),
      initialStack: Number(body.initialStack ?? 2000),
      startAt: new Date(String(body.startAt ?? Date.now())),
      blindSmall: Number(body.blindSmall ?? 10),
      blindBig: Number(body.blindBig ?? 20),
    })
    res.status(201).json(id)
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.get('/', authMiddleware, async (_req, res) => {
  const rows = await listOpenTournaments()
  res.json(rows)
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
    await joinTournament(req.params.id, userId, (req.body as { code?: string })?.code)
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    await leaveTournament(req.params.id, userId)
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
    await startTournamentFromDb(req.params.id, io)
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: (e as Error).message })
  }
})

export default router
