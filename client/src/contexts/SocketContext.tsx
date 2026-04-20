import React, { createContext, useEffect, useState, useCallback } from 'react'
import i18n from '../i18n/config'
import { io, Socket } from 'socket.io-client'
import { useUser } from '../hooks/useUser'
import { useToast } from './ToastContext'
import { store } from '../store'
import { api } from '../services/api'
import { fetchBalanceFromServer } from '../utils/userProfile'
import { getApiBaseUrl } from '../utils/apiBase'

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

// 🚀 DÉTECTION INFAILLIBLE DU CHEMIN
const getSocketConfig = () => {
  let url = (import.meta.env.VITE_SOCKET_URL ?? '').toString().trim() || 'http://localhost:3000';
  let path = '/socket.io';

  if (typeof window !== 'undefined') {
    const { protocol, pathname } = window.location;
    const pathParts = pathname.split('/');

    // Capacitor / WebView : pas de pathname /vm... — il faut la même base que l’API (déploiement ou URL absolue).
    if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') {
      const explicitPath = (import.meta.env.VITE_SOCKET_PATH ?? '').toString().trim();
      if (explicitPath) {
        path = explicitPath.startsWith('/') ? explicitPath : `/${explicitPath}`;
      } else {
        const apiEnv = (import.meta.env.VITE_API_URL ?? '').toString().trim();
        const vmRel = apiEnv.match(/^(\/vm[^/]+)/i);
        if (vmRel) path = `${vmRel[1]}/socket.io`;
        else if (apiEnv.startsWith('http')) {
          try {
            const u = new URL(apiEnv);
            const first = u.pathname.replace(/\/$/, '').split('/').filter(Boolean)[0];
            if (first?.toLowerCase().startsWith('vmprojet')) path = `/${first}/socket.io`;
          } catch {
            /* ignore */
          }
        }
      }
      const socketUrlEnv = (import.meta.env.VITE_SOCKET_URL ?? '').toString().trim();
      if (socketUrlEnv) url = socketUrlEnv;
      else {
        const base = getApiBaseUrl();
        if (base) url = base;
      }
      return { URL: url, SOCKET_PATH: path };
    }

    // Auto-détection (marche pour VM 0 et VM 1)
    if (pathParts.length > 1 && pathParts[1].toLowerCase().startsWith('vmprojet')) {
      const vmPrefix = '/' + pathParts[1];
      url = window.location.origin;
      path = `${vmPrefix}/socket.io`;
    } else if (url.startsWith('/')) {
      path = `${url}/socket.io`;
      url = window.location.origin;
    }
  }
  return { URL: url, SOCKET_PATH: path };
};

const { URL, SOCKET_PATH } = getSocketConfig();

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

    // 🚀 INITIALISATION AVEC LE BON CHEMIN
    const socketInstance = io(URL, {
      forceNew: true, // <--- TUE LE CACHE DE SOCKET.IO !
      autoConnect: true,
      path: SOCKET_PATH,
      auth: { token },
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
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

    socket.on('FRIEND_STATUS_CHANGED', (data: { userId?: string; status?: string; username?: string }) => {
      const name = data.username ?? data.userId ?? 'Un ami'
      const key = data.status === 'online' ? 'toast.friendIsOnline' : 'toast.friendIsOffline'
      addToast(i18n.t(key, { name }), 'info')
    })

    socket.on('GAME_INVITATION_RECEIVED', (data: GameInvitationNotification) => {
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