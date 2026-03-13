import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useUser } from '../hooks/useUser'

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