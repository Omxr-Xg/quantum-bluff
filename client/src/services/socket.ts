import { io } from 'socket.io-client'
import { getSocketIoUrlAndPath } from '../utils/socketConnect'

const { url: socketUrl, path: socketPath } = getSocketIoUrlAndPath()

if (import.meta.env.MODE === 'capacitor') {
  console.info('[QB] Socket.IO config', { url: socketUrl, path: socketPath })
}

export const socket = io(socketUrl, {
  autoConnect: false,
  withCredentials: true,
  path: socketPath,
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
})

const socketDebug = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args)
}

socketDebug('[FRONT][SOCKET] init', {
  url: socketUrl,
  path: socketPath,
  tokenPresent: Boolean(localStorage.getItem('token')),
})

socket.on('connect', () => {
  if (import.meta.env.MODE === 'capacitor') {
    console.info('[QB] Socket.IO connected', { id: socket.id })
  }
  socketDebug('[FRONT][SOCKET] connect', {
    socketId: socket.id,
    connected: socket.connected,
    url: socketUrl,
    path: socketPath,
  })
})

socket.on('disconnect', (reason) => {
  socketDebug('[FRONT][SOCKET] disconnect', {
    socketId: socket.id,
    reason,
  })
})

socket.on('connect_error', (error) => {
  if (import.meta.env.MODE === 'capacitor') {
    console.warn('[QB] Socket.IO connect_error', error?.message ?? error)
  }
  socketDebug('[FRONT][SOCKET] connect_error', {
    message: error.message,
    name: error.name,
  })
})

socket.io.on('reconnect', (attempt) => {
  socketDebug('[FRONT][SOCKET] reconnect', {
    attempt,
    socketId: socket.id,
  })
})

socket.io.on('reconnect_attempt', (attempt) => {
  socketDebug('[FRONT][SOCKET] reconnect_attempt', {
    attempt,
  })
})
