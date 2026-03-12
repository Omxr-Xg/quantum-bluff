import express from 'express'
import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'

const router = express.Router()

const games: Map<string, GameTable> = new Map()
const players: Map<string, Player> = new Map()

router.get('/games', (req, res) => {
  const availableGames = Array.from(games.entries()).map(([id, table]) => ({
    id,
    playerCount: table.state.players.length,
    maxPlayers: 9,
    status: table.state.phase
  }))

  res.json(availableGames)
})

router.post('/games', (req, res) => {
  const { playerName } = req.body

  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ error: 'Nom du joueur invalide' })
  }

  const playerId = `player_${Date.now()}`

  const player: Player = {
    id: playerId,
    name: playerName,
    cards: [],
    chips: 1000,
    role: 'PLAYER',
    isActive: true,
    position: 0,
    isDealer: false,
    isConnected: true
  }

  players.set(playerId, player)

  const gameId = `game_${Date.now()}`
  const gameTable = new GameTable(gameId, [player])

  games.set(gameId, gameTable)

  res.json({ gameId, playerId })
})

router.post('/games/:gameId/join', (req, res) => {
  const { gameId } = req.params
  const { playerName } = req.body

  if (!playerName || typeof playerName !== 'string') {
    return res.status(400).json({ error: 'Nom du joueur invalide' })
  }

  const gameTable = games.get(gameId)

  if (!gameTable) {
    return res.status(404).json({ error: 'Partie introuvable' })
  }

  if (gameTable.state.players.length >= 9) {
    return res.status(400).json({ error: 'La partie est complète' })
  }

  const playerId = `player_${Date.now()}`

  const player: Player = {
    id: playerId,
    name: playerName,
    cards: [],
    chips: 1000,
    role: 'PLAYER',
    isActive: true,
    position: gameTable.state.players.length,
    isDealer: false,
    isConnected: true
  }

  players.set(playerId, player)
  gameTable.addPlayer(player)

  res.json({
    gameId,
    playerId,
    gameState: gameTable.getSanitizedState()
  })
})

router.get('/games/:gameId', (req, res) => {
  const { gameId } = req.params

  const gameTable = games.get(gameId)

  if (!gameTable) {
    return res.status(404).json({ error: 'Partie introuvable' })
  }

  res.json(gameTable.getSanitizedState())
})

export default router