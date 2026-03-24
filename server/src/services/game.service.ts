import { GameTable } from '../logic/GameTable.js'
import type { Player } from '../types/poker.js'

class GameService {
  private games: Map<string, GameTable> = new Map()

  listGames() {
    return Array.from(this.games.entries()).map(([id, table]) => ({
      id,
      playerCount: table.state.players.length,
      maxPlayers: 9,
      status: table.state.phase
    }))
  }

  createGame(playerName: string) {
    const playerId = `player_${Date.now()}_${Math.floor(Math.random() * 100000)}`
    const gameId = `game_${Date.now()}_${Math.floor(Math.random() * 100000)}`

    const player: Player = {
      id: playerId,
      name: playerName,
      cards: [],
      chips: 1000,
      role: 'PLAYER',
      currentBet: 0,
      isActive: true,
      position: 0,
      isDealer: false,
      isConnected: true
    }

    const table = new GameTable(gameId, [player])
    this.games.set(gameId, table)

    return { gameId, playerId, player, gameState: table.getSanitizedState(playerId) }
  }

  joinGame(gameId: string, playerName: string) {
    const table = this.games.get(gameId)

    if (!table) {
      throw new Error('Partie introuvable')
    }

    if (table.state.players.length >= 9) {
      throw new Error('La partie est complète')
    }

    const playerId = `player_${Date.now()}_${Math.floor(Math.random() * 100000)}`

    const player: Player = {
      id: playerId,
      name: playerName,
      cards: [],
      chips: 1000,
      role: 'PLAYER',
      currentBet: 0,
      isActive: true,
      position: table.state.players.length,
      isDealer: false,
      isConnected: true
    }

    table.addPlayer(player)

    return { gameId, playerId, player, gameState: table.getSanitizedState(playerId) }
  }

  getGame(gameId: string) {
    return this.games.get(gameId)
  }

  removeGame(gameId: string) {
    this.games.delete(gameId)
  }
}

export const gameService = new GameService()