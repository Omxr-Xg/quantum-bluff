import { io } from 'socket.io-client'

const resolveSocketUrl = (): string => {
  const envUrl = (import.meta.env.VITE_SOCKET_URL ?? '').toString().trim()
  if (envUrl) return envUrl

  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return window.location.origin
  }

  return 'http://localhost:3000'
}

const URL = resolveSocketUrl()

const path =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/socket.io'
    : '/vmProjetIntegrateurgrp10-0/socket.io'

export const socket = io(URL, {
  autoConnect: true,
  withCredentials: true,
  path,
  transports: ['polling', 'websocket'],
  auth: {
    token: localStorage.getItem('token'),
  },
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
})

console.log('[FRONT][SOCKET] init', {
  url: URL,
  path,
  tokenPresent: Boolean(localStorage.getItem('token')),
})

socket.on('connect', () => {
  console.log('[FRONT][SOCKET] connect', {
    socketId: socket.id,
    connected: socket.connected,
    ioUri: socket.io.uri,
  })
})

socket.on('disconnect', (reason) => {
  console.log('[FRONT][SOCKET] disconnect', {
    socketId: socket.id,
    reason,
  })
})

socket.on('connect_error', (error) => {
  console.log('[FRONT][SOCKET] connect_error', {
    message: error.message,
    name: error.name,
  })
})

socket.io.on('reconnect', (attempt) => {
  console.log('[FRONT][SOCKET] reconnect', {
    attempt,
    socketId: socket.id,
  })
})

socket.io.on('reconnect_attempt', (attempt) => {
  console.log('[FRONT][SOCKET] reconnect_attempt', {
    attempt,
  })
})