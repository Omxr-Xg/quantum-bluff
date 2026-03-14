import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUser } from '../hooks/useUser'
import { useToast } from './ToastContext'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  connect: () => void
  disconnect: () => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

const URL =
  process.env.NODE_ENV === 'production'
    ? 'https://votre-domaine.com'
    : 'http://localhost:3000'

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [authVersion, setAuthVersion] = useState(0)
  const { userId } = useUser()
  const { addToast } = useToast()

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
      addToast(`Nouvelle demande d'ami de ${data.sender?.username ?? 'un joueur'}`, 'info')
      if (window.location.pathname === '/friends') {
        window.dispatchEvent(new CustomEvent('refetch-requests'))
      }
    })

    socket.on('FRIEND_REQUEST_ACCEPTED', (data: { username?: string }) => {
      addToast(`${data.username ?? 'Un ami'} a accepté votre demande d'ami !`, 'success')
      if (window.location.pathname === '/friends') {
        window.dispatchEvent(new CustomEvent('refetch-friends'))
      }
    })

    socket.on('FRIEND_STATUS_CHANGED', (data: { userId?: string; status?: string; username?: string }) => {
      const statusText = data.status === 'online' ? 'en ligne' : 'hors ligne'
      addToast(`${data.username ?? data.userId ?? 'Un ami'} est ${statusText}`, 'info')
    })

    return () => {
      socket.off('FRIEND_REQUEST_RECEIVED')
      socket.off('FRIEND_REQUEST_ACCEPTED')
      socket.off('FRIEND_STATUS_CHANGED')
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
        leaveRoom
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