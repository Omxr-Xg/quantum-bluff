import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '../hooks/useUser';

interface SocketContextType {
  socket: Socket | null;        // ← AJOUTER CETTE LIGNE
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const URL = process.env.NODE_ENV === 'production' 
  ? 'https://votre-domaine.com' 
  : 'http://localhost:3000';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { userId } = useUser();

  useEffect(() => {
    // Créer une nouvelle instance de socket
    const socketInstance = io(URL, {
      autoConnect: false,
      withCredentials: true
    });

    setSocket(socketInstance);

    // Écouter les événements de connexion
    socketInstance.on('connect', () => {
      console.log('Socket connecté');
      setIsConnected(true);
      if (userId) {
        socketInstance.emit('authenticate', { userId });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket déconnecté');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Erreur de connexion socket:', error);
    });

    // Nettoyage
    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
      socketInstance.disconnect();
    };
  }, [userId]);

  const connect = () => {
    if (socket && !socket.connected) {
      socket.connect();
    }
  };

  const disconnect = () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  };

  const joinRoom = (roomId: string) => {
    if (socket && socket.connected) {
      socket.emit('join-room', { roomId, userId });
    }
  };

  const leaveRoom = (roomId: string) => {
    if (socket && socket.connected) {
      socket.emit('leave-room', { roomId, userId });
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket,              // ← MAINTENANT DISPONIBLE
      isConnected, 
      connect, 
      disconnect, 
      joinRoom, 
      leaveRoom 
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};