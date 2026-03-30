import { io } from 'socket.io-client'

const resolveSocketUrl = (): string => {
  const envUrl = (import.meta.env.VITE_SOCKET_URL ?? '').toString().trim()
  if (envUrl) return envUrl

  // En `vite dev`, on doit passer par le proxy Vite pour éviter d’appeler directement `:3000`.
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return window.location.origin
  }

  // Fallback (ex: build preview sans proxy) : backend direct.
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