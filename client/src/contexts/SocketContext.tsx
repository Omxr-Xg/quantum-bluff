import React, { createContext, useEffect, useState, useCallback } from 'react'
import i18n from '../i18n/config'
import { io, Socket } from 'socket.io-client'
import { useUser } from '../hooks/useUser'
import { useToast } from './ToastContext'
import { store } from '../store'
import { api } from '../services/api'
import { fetchBalanceFromServer } from '../utils/userProfile'
import { apiUrl } from '../utils/apiBase'
import { getSocketIoUrlAndPath } from '../utils/socketConnect'
import { getAuthItem } from '../utils/authStorage'

export interface GameInvitationNotification {
  invitationId: string
  roomId: string
  roomName: string
  sender: { id: string; username: string }
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

const { url: socketIoUrl, path: socketIoPath } = getSocketIoUrlAndPath()

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
    const token = getAuthItem('token')

    if (!token) {
      setSocket(null)
      setIsConnected(false)
      return
    }

    const socketInstance = io(socketIoUrl, {
      forceNew: true, // <--- TUE LE CACHE DE SOCKET.IO !
      autoConnect: true,
      path: socketIoPath,
      auth: { token },
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    })

    if (import.meta.env.MODE === 'capacitor') {
      console.info('[QB] SocketContext Socket.IO', { url: socketIoUrl, path: socketIoPath })
    }

    setSocket(socketInstance)

    socketInstance.on('connect', () => {
      setIsConnected(true)
      if (import.meta.env.MODE === 'capacitor') {
        console.info('[QB] SocketContext connected', { id: socketInstance.id })
      }
      const uid = getAuthItem('userId')
      if (uid) socketInstance.emit('JOIN_USER_ROOM', { userId: uid })
    })

    socketInstance.on('disconnect', () => setIsConnected(false))

    socketInstance.on('connect_error', (err) => {
      if (import.meta.env.MODE === 'capacitor') {
        console.warn('[QB] SocketContext connect_error', err?.message ?? err)
      }
    })

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
      const s = socketInstance
      setTimeout(() => {
        if (s.connected) s.disconnect()
      }, 0)
    }
  }, [userId, authVersion])

  useEffect(() => {
    if (!socket || !addToast) return

    socket.on('FRIEND_REQUEST_RECEIVED', (_data: { sender?: { username?: string } }) => {
      window.dispatchEvent(new CustomEvent('refetch-requests'))
    })

    socket.on('FRIEND_REQUEST_ACCEPTED', (_data: { username?: string }) => {
      if (window.location.pathname === '/friends') {
        window.dispatchEvent(new CustomEvent('refetch-friends'))
      }
    })

    socket.on('GAME_INVITATION_RECEIVED', (data: GameInvitationNotification) => {
      window.dispatchEvent(new CustomEvent('play-notification-sfx'))
      addToast(
        i18n.t('invitation.title', { username: data.sender?.username ?? 'un joueur' }),
        'info',
        () => { window.dispatchEvent(new CustomEvent('open-notification-panel')) }
      )
      setPendingInvitations((prev) => {
        if (prev.some((inv) => inv.invitationId === data.invitationId)) return prev
        return [...prev, data]
      })
    })

    socket.on('JOIN_REQUEST_RECEIVED', (data: { user?: { username?: string }; roomId?: string }) => {
      addToast(
        i18n.t('toast.joinRequestFrom', { username: data.user?.username ?? 'un joueur' }),
        'info',
        data.roomId ? () => window.dispatchEvent(new CustomEvent('navigate-to', { detail: `/waiting-room?roomId=${data.roomId}` })) : undefined
      )
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
      socket.off('GAME_INVITATION_RECEIVED')
      socket.off('JOIN_REQUEST_RECEIVED')
      socket.off('JOIN_REQUEST_ACCEPTED')
      socket.off('JOIN_REQUEST_REJECTED')
    }
  }, [socket, addToast])

  /** Invitations salle d’attente déjà en base (reconnexion / onglet rechargé). */
  useEffect(() => {
    if (!socket || !userId) return
    const token = getAuthItem('token')
    if (!token) return

    let cancelled = false
    const load = async () => {
      try {
        const r = await fetch(apiUrl('/api/friends/received'), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!r.ok || cancelled) return
        const list = await r.json() as Array<{
          id: string
          roomId: string
          room?: { name?: string; status?: string }
          sender?: { id?: string; username?: string }
        }>
        const mapped: GameInvitationNotification[] = list
          .filter((row) => row.room?.status === 'WAITING')
          .map((row) => ({
            invitationId: row.id,
            roomId: row.roomId,
            roomName: row.room?.name ?? '',
            sender: {
              id: String(row.sender?.id ?? ''),
              username: row.sender?.username ?? '?',
            },
          }))
        if (mapped.length === 0 || cancelled) return
        setPendingInvitations((prev) => {
          const seen = new Set(prev.map((p) => p.invitationId))
          const extra = mapped.filter((m) => !seen.has(m.invitationId))
          if (extra.length === 0) return prev
          return [...prev, ...extra]
        })
      } catch {
        /* ignore */
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [socket, userId])

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