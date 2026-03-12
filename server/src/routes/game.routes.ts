import express from 'express'
import { gameService } from '../services/game.service.js'

const router = express.Router()

router.get('/games', (_req, res) => {
  res.json(gameService.listGames())
})

router.post('/games', (req, res) => {
  const { playerName } = req.body

  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ error: 'Nom du joueur invalide' })
  }

  const result = gameService.createGame(playerName)
  return res.status(201).json(result)
})

router.post('/games/:gameId/join', (req, res) => {
  const { gameId } = req.params
  const { playerName } = req.body

  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ error: 'Nom du joueur invalide' })
  }

  try {
    const result = gameService.joinGame(gameId, playerName)
    return res.json(result)
  } catch (error) {
    const message = (error as Error).message

    if (message === 'Partie introuvable') {
      return res.status(404).json({ error: message })
    }

    return res.status(400).json({ error: message })
  }
})

router.get('/games/:gameId', (req, res) => {
  const { gameId } = req.params
  const game = gameService.getGame(gameId)

  if (!game) {
    return res.status(404).json({ error: 'Partie introuvable' })
  }

  return res.json(game.getSanitizedState())
})

router.post('/games/:gameId/start', (req, res) => {
  const { gameId } = req.params
  const game = gameService.getGame(gameId)

  if (!game) {
    return res.status(404).json({ error: 'Partie introuvable' })
  }

  try {
    game.startHand()
    return res.json(game.getSanitizedState())
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message })
  }
})

router.post('/games/:gameId/action', (req, res) => {
  const { gameId } = req.params
  const { playerId, action, amount } = req.body

  const game = gameService.getGame(gameId)

  if (!game) {
    return res.status(404).json({ error: 'Partie introuvable' })
  }

  if (!playerId || !action) {
    return res.status(400).json({ error: 'Paramètres manquants' })
  }

  try {
    game.handlePlayerAction(playerId, action, amount)
    return res.json(game.getSanitizedState(playerId))
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message })
  }
})

export default router