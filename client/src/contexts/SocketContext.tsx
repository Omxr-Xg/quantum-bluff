import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import i18n from '../i18n/config'
import { io, Socket } from 'socket.io-client'
import { useUser } from '../hooks/useUser'
import { useToast } from './ToastContext'

export interface GameInvitationNotification {
  invitationId: string
  roomId: string
  roomName: string
  sender: { id: string; username: string }
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

const SocketContext = createContext<SocketContextType | undefined>(undefined)

// En dev : backend sur 3000. Sur localhost (Vite/preview) : idem, pour éviter ws://localhost:5173.
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const URL = import.meta.env.DEV || isLocalhost ? 'http://localhost:3000' : window.location.origin;

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
    console.log('SOCKET CONTEXT TOKEN:', token)

    if (!token) {
      setSocket(null)
      setIsConnected(false)
      return
    }

    const socketInstance = io(URL, {
      autoConnect: true,
      // Connexion directe au backend (localhost:3000) : path par défaut. Sinon sous-dossier prod.
      path: (URL.includes('localhost') || URL.includes('127.0.0.1')) ? '' : '/vmProjetIntegrateurgrp10-0/socket.io/',
      auth: {
        token
      }
    })

    setSocket(socketInstance)

    socketInstance.on('connect', () => {
      console.log('Socket connecté')
      setIsConnected(true)
    })

    const uid = localStorage.getItem('userId')
    if (uid) {
      socketInstance.emit('JOIN_USER_ROOM', { userId: uid })
    }

    socketInstance.on('disconnect', () => {
      console.log('Socket déconnecté')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Erreur de connexion socket:', error)
    })

    return () => {
      socketInstance.off('connect')
      socketInstance.off('disconnect')
      socketInstance.off('connect_error')
      socketInstance.disconnect()
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

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}