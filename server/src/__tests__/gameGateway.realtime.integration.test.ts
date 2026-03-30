import { createServer, type Server as HttpServer } from 'node:http'
import { AddressInfo } from 'node:net'
import jwt from 'jsonwebtoken'
import { Server as SocketIOServer } from 'socket.io'
import { io as createClient, Socket as ClientSocket } from 'socket.io-client'
import { GameGateway } from '../sockets/game.gateway.js'
import { CashGameController } from '../logic/CashGameController.js'
import { activeGames } from '../shared/activeGames.js'

function waitForEvent<T>(
  socket: ClientSocket,
  event: string,
  timeoutMs = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(event, onEvent)
      reject(new Error(`Timeout waiting for ${event}`))
    }, timeoutMs)

    const onEvent = (payload: T) => {
      clearTimeout(timeout)
      socket.off(event, onEvent)
      resolve(payload)
    }

    socket.on(event, onEvent)
  })
}

describe('GameGateway realtime integration', () => {
  let httpServer: HttpServer
  let ioServer: SocketIOServer
  let baseUrl = ''
  const clients: ClientSocket[] = []

  beforeAll(async () => {
    httpServer = createServer()
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    })
    new GameGateway(ioServer)

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve())
    })

    const port = (httpServer.address() as AddressInfo).port
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(async () => {
    for (const client of clients) {
      if (client.connected) client.disconnect()
    }
    await new Promise<void>((resolve) => ioServer.close(() => resolve()))
    await new Promise<void>((resolve) => httpServer.close(() => resolve()))
  })

  async function connectAs(userId: string): Promise<ClientSocket> {
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET || 'quantum_bluff_secret'
    )
    const client = createClient(baseUrl, {
      transports: ['websocket'],
      auth: { token },
    })
    clients.push(client)
    await waitForEvent(client, 'connect')
    return client
  }

  test('CASH_LEAVE in heads-up dissolves table and emits GAME_ENDED', async () => {
    const gameId = `it-game-${Date.now()}`
    const game = new CashGameController({
      id: gameId,
      roomId: 'room-it',
    })
    game.initFromRoomPlayers([
      { userId: 'u1', username: 'u1', chips: 1000 },
      { userId: 'u2', username: 'u2', chips: 1000 },
    ])
    await activeGames.set(gameId, game)

    const u1 = await connectAs('u1')
    const u2 = await connectAs('u2')

    u1.emit('JOIN_GAME', { gameId, playerId: 'u1' })
    u2.emit('JOIN_GAME', { gameId, playerId: 'u2' })
    await waitForEvent(u1, 'GAME_UPDATE')
    await waitForEvent(u2, 'GAME_UPDATE')

    const playerLeftPromise = waitForEvent<{
      gameId: string
      playerId: string
      scope: string
    }>(u2, 'PLAYER_LEFT')
    const gameEndedPromise = waitForEvent<{
      gameId: string
      reason: string
      roomId?: string
    }>(u2, 'GAME_ENDED')

    u1.emit('CASH_LEAVE', { gameId })

    const playerLeft = await playerLeftPromise
    const gameEnded = await gameEndedPromise

    expect(playerLeft.gameId).toBe(gameId)
    expect(playerLeft.playerId).toBe('u1')
    expect(playerLeft.scope).toBe('GAME')
    expect(gameEnded.reason).toBe('heads_up_peer_left')
    expect(gameEnded.roomId).toBe('room-it')
    expect(await activeGames.get(gameId)).toBeUndefined()
  })
})
