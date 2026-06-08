import type { Server } from 'socket.io'
import { prisma } from '../../config/database.js'
import { fillBeloteRoomWithBots } from './beloteRoomBots.service.js'
import { getGameIo } from '../../sockets/gameIo.registry.js'

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export function clearBeloteAutoFillTimer(roomId: string): void {
  const t = timers.get(roomId)
  if (t) clearTimeout(t)
  timers.delete(roomId)
}

export function rescheduleBeloteAutoFill(roomId: string, io?: Server): void {
  clearBeloteAutoFillTimer(roomId)
  void (async () => {
    const room = await prisma.beloteRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        status: true,
        hostId: true,
        autoFillBotsEnabled: true,
        autoFillBotsDelaySec: true,
        defaultBotDifficulty: true,
        seats: { select: { id: true } },
      },
    })
    if (!room || room.status !== 'WAITING' || !room.autoFillBotsEnabled) return
    if (room.seats.length >= 4) return

    const delayMs = Math.max(5, room.autoFillBotsDelaySec) * 1000
    const timer = setTimeout(() => {
      timers.delete(roomId)
      void (async () => {
        const fresh = await prisma.beloteRoom.findUnique({
          where: { id: roomId },
          select: {
            status: true,
            hostId: true,
            autoFillBotsEnabled: true,
            seats: { select: { id: true } },
          },
        })
        if (!fresh || fresh.status !== 'WAITING' || !fresh.autoFillBotsEnabled) return
        if (fresh.seats.length >= 4) return
        const socketIo = io ?? getGameIo()
        await fillBeloteRoomWithBots(roomId, fresh.hostId, undefined, socketIo)
      })()
    }, delayMs)

    timer.unref?.()
    timers.set(roomId, timer)
  })()
}
