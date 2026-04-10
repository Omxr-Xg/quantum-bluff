import { io } from 'socket.io-client'

const resolveSocketUrl = (): string => {
  const envUrl = (import.meta.env.VITE_SOCKET_URL ?? '').toString().trim()
  if (envUrl) return envUrl

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return 'http://localhost:3000'
}

const URL = resolveSocketUrl()

/** Chemin Socket.IO côté serveur (Nginx prefix VM vs backend direct). */
const resolveSocketPath = (): string => {
  const explicit = (import.meta.env.VITE_SOCKET_PATH ?? '').toString().trim()
  if (explicit) return explicit.startsWith('/') ? explicit : `/${explicit}`

  const hasSocketEnv = Boolean((import.meta.env.VITE_SOCKET_URL ?? '').toString().trim())

  if (hasSocketEnv) return '/socket.io'

  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (h === 'localhost' || h === '127.0.0.1') return '/socket.io'
  }
  return '/vmProjetIntegrateurgrp10-0/socket.io'
}

const path = resolveSocketPath()

export const socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
  path,
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
  url: URL,
  path,
  tokenPresent: Boolean(localStorage.getItem('token')),
})

socket.on('connect', () => {
  socketDebug('[FRONT][SOCKET] connect', {
    socketId: socket.id,
    connected: socket.connected,
    ioUri: socket.io.uri,
  })
})

socket.on('disconnect', (reason) => {
  socketDebug('[FRONT][SOCKET] disconnect', {
    socketId: socket.id,
    reason,
  })
})

socket.on('connect_error', (error) => {
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
