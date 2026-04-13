import React, { createContext, useEffect, useState, useCallback } from 'react'
import i18n from '../i18n/config'
import { io, Socket } from 'socket.io-client'
import { useUser } from '../hooks/useUser'
import { useToast } from './ToastContext'
import { store } from '../store'
import { api } from '../services/api'
import { fetchBalanceFromServer } from '../utils/userProfile'

export interface GameInvitationNotification {
  invitationId: string
  roomId: string
  roomName: string
  sender: { id: string; username: string }
  /** Absent ou `poker` : salle d’attente poker. `blackjack` : table blackjack multijoueur. */
  game?: 'poker' | 'blackjack'
}

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
  pendingInvitations: GameInvitationNotification[]
  dismissInvitation: (invitationId: string) => void
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined)

const socketUrl = (import.meta.env.VITE_SOCKET_URL ?? '').toString().trim() || undefined;

/** Base URL Socket.IO : env > dev localhost via Vite (proxy → :3000) > prod / réseau. */
function resolveSocketBaseUrl(): string {
  if (socketUrl) return socketUrl
  if (typeof window === 'undefined') return 'http://localhost:3000'
  const host = window.location.hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1'
  // En `vite dev`, la page est sur :5175 : utiliser la même origine pour que /socket.io soit proxifié vers le backend.
  // Sinon le client tape directement :3000 → ERR_CONNECTION_REFUSED si l’API n’écoute pas encore ou autre souci réseau local.
  if (import.meta.env.DEV && isLocal) {
    return window.location.origin
  }
  if (isLocal) {
    return 'http://localhost:3000'
  }
  return window.location.origin
}

let URL = resolveSocketBaseUrl()

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// NOUVEAU : Blocage strict du Mixed Content
// Si le site est chargé en HTTPS, on force l'URL à utiliser l'origine sécurisée.
// Nginx prendra automatiquement le relais (en WSS) sur le port 443.
if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  try {
    const parsed = new URL(URL)
    const insecureForHttpsPage =
      parsed.protocol === 'http:' || parsed.protocol === 'ws:' || parsed.port === '3000'
    if (insecureForHttpsPage) {
      URL = window.location.origin
    }
  } catch {
    /* URL absolue attendue depuis resolveSocketBaseUrl */
  }
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [authVersion, setAuthVersion] = useState(0)
  const [pendingInvitations, setPendingInvitations] = useState<GameInvitationNotification[]>([])
  const { userId } = useUser()
  const { addToast } = useToast()

  const dismissInvitation = useCallback((invitationId: string) => {
    setPendingInvitations((prev) => prev.filter((inv) => inv.invitationId !== invitationId))
  }, [])

  useEffect(() => {
    const handleAuthChanged = () => {
      setAuthVersion((v) => v + 1)
    }

    window.addEventListener('auth-changed', handleAuthChanged)
    return () => window.removeEventListener('auth-changed', handleAuthChanged)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      setSocket(null)
      setIsConnected(false)
      return
    }

    const socketInstance = io(URL, {
      autoConnect: true,
      path: isLocalhost || URL.includes('localhost') || URL.includes('127.0.0.1')
        ? '/socket.io'
        : '/vmProjetIntegrateurgrp10-0/socket.io', // Toujours utiliser ce chemin en Prod/VM
      auth: { token },
      // Ne pas forcer WebSocket seul : polling puis upgrade évite beaucoup d’échecs en dev / réseaux stricts
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    })

    setSocket(socketInstance)

    socketInstance.on('connect', () => {
      setIsConnected(true)
      const uid = localStorage.getItem('userId')
      if (uid) socketInstance.emit('JOIN_USER_ROOM', { userId: uid })
    })

    socketInstance.on('disconnect', () => setIsConnected(false))

    socketInstance.on('connect_error', () => {})

    // Safari/iOS : reconnecter quand l'onglet revient au premier plan (WebSocket "suspended")
    const tryReconnect = () => {
      if (!socketInstance.connected) socketInstance.connect()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryReconnect()
    }
    const onPageshow = (e: PageTransitionEvent) => {
      if (e.persisted) tryReconnect()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', onPageshow)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', onPageshow)
      socketInstance.off('connect')
      socketInstance.off('disconnect')
      socketInstance.off('connect_error')
      // Ne disconnect que si connecté (évite "closed before established" en Strict Mode)
      const s = socketInstance
      setTimeout(() => {
        if (s.connected) s.disconnect()
      }, 0)
    }
  }, [userId, authVersion])

  useEffect(() => {
    if (!socket || !addToast) return

    socket.on('FRIEND_REQUEST_RECEIVED', (data: { sender?: { username?: string } }) => {
      addToast(i18n.t('toast.friendRequestFrom', { username: data.sender?.username ?? 'un joueur' }), 'info')
      window.dispatchEvent(new CustomEvent('refetch-requests'))
    })

    socket.on('FRIEND_REQUEST_ACCEPTED', (data: { username?: string }) => {
      addToast(i18n.t('toast.friendRequestAccepted', { username: data.username ?? 'Un ami' }), 'success')
      if (window.location.pathname === '/friends') {
        window.dispatchEvent(new CustomEvent('refetch-friends'))
      }
    })

    socket.on('FRIEND_STATUS_CHANGED', (data: { userId?: string; status?: string; username?: string }) => {
      const name = data.username ?? data.userId ?? 'Un ami'
      const key = data.status === 'online' ? 'toast.friendIsOnline' : 'toast.friendIsOffline'
      addToast(i18n.t(key, { name }), 'info')
    })

    socket.on('GAME_INVITATION_RECEIVED', (data: GameInvitationNotification) => {
      addToast(i18n.t('invitation.title', { username: data.sender?.username ?? 'un joueur' }), 'info')
      setPendingInvitations((prev) => {
        if (prev.some((inv) => inv.invitationId === data.invitationId)) return prev
        return [...prev, data]
      })
    })

    socket.on('JOIN_REQUEST_RECEIVED', (data: { user?: { username?: string } }) => {
      addToast(i18n.t('toast.joinRequestFrom', { username: data.user?.username ?? 'un joueur' }), 'info')
    })

    socket.on('JOIN_REQUEST_ACCEPTED', (data: { roomId?: string; roomName?: string }) => {
      addToast(i18n.t('toast.joinRequestAccepted', { room: data.roomName ?? '' }), 'success')
      if (data.roomId) {
        window.dispatchEvent(new CustomEvent('join-request-accepted', { detail: { roomId: data.roomId } }))
      }
    })

    socket.on('JOIN_REQUEST_REJECTED', (data: { roomName?: string }) => {
      addToast(i18n.t('toast.joinRequestRejected', { room: data.roomName ?? '' }), 'error')
    })

    return () => {
      socket.off('FRIEND_REQUEST_RECEIVED')
      socket.off('FRIEND_REQUEST_ACCEPTED')
      socket.off('FRIEND_STATUS_CHANGED')
      socket.off('GAME_INVITATION_RECEIVED')
      socket.off('JOIN_REQUEST_RECEIVED')
      socket.off('JOIN_REQUEST_ACCEPTED')
      socket.off('JOIN_REQUEST_REJECTED')
    }
  }, [socket, addToast])

  useEffect(() => {
    if (!socket) return

    const invalidateLoanList = () => {
      store.dispatch(api.util.invalidateTags(['FriendLoan']))
    }

    const invalidateLoanListAndSyncBalance = () => {
      invalidateLoanList()
      void fetchBalanceFromServer({ authoritative: true })
    }

    const notifyOnly = [
      'LOAN_REQUEST_RECEIVED',
      'LOAN_REQUEST_ACCEPTED',
      'LOAN_REQUEST_REJECTED',
    ] as const
    const walletEvents = ['LOAN_CREATED', 'LOAN_REPAYMENT_PROGRESS', 'LOAN_COMPLETED'] as const

    notifyOnly.forEach((ev) => socket.on(ev, invalidateLoanList))
    walletEvents.forEach((ev) => socket.on(ev, invalidateLoanListAndSyncBalance))

    return () => {
      notifyOnly.forEach((ev) => socket.off(ev, invalidateLoanList))
      walletEvents.forEach((ev) => socket.off(ev, invalidateLoanListAndSyncBalance))
    }
  }, [socket])

  const connect = useCallback(() => {
    if (socket && !socket.connected) {
      socket.connect()
    }
  }, [socket])

  const disconnect = useCallback(() => {
    if (socket && socket.connected) {
      socket.disconnect()
    }
  }, [socket])

  const joinRoom = useCallback((roomId: string) => {
    if (socket && socket.connected && userId) {
      socket.emit('join-room', { roomId, userId })
    }
  }, [socket, userId])

  const leaveRoom = useCallback((roomId: string) => {
    if (socket && socket.connected && userId) {
      socket.emit('leave-room', { roomId, userId })
    }
  }, [socket, userId])

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connect,
        disconnect,
        joinRoom,
        leaveRoom,
        pendingInvitations,
        dismissInvitation,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
