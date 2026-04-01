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

/** Chemin Socket.IO côté serveur (Nginx prefix VM vs backend direct). */
const resolveSocketPath = (): string => {
  const explicit = (import.meta.env.VITE_SOCKET_PATH ?? '').toString().trim()
  if (explicit) return explicit.startsWith('/') ? explicit : `/${explicit}`

  const hasSocketEnv = Boolean((import.meta.env.VITE_SOCKET_URL ?? '').toString().trim())
  // Backend direct (Capacitor / Electron / IP:3000) : chemin par défaut Socket.IO
  if (hasSocketEnv) return '/socket.io'

  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (h === 'localhost' || h === '127.0.0.1') return '/socket.io'
  }
  return '/vmProjetIntegrateurgrp10-0/socket.io'
}

const path = resolveSocketPath()

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