import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { socket } from '../services/socket';

export function NetworkOverlay() {
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'reconnected'>('online');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const handleBrowserOffline = () => {
      setNetworkStatus('offline');
    };

    const handleBrowserOnline = () => {
      setNetworkStatus('reconnected');
      setTimeout(() => {
        setNetworkStatus('online');
      }, 3000);
    };

    const handleSocketDisconnect = (reason: string) => {
      if (reason !== 'io client disconnect') {
        setNetworkStatus('offline');
      }
    };

    const handleSocketConnect = () => {
      setReconnectAttempts(0);
      setNetworkStatus((prev) => {
        if (prev === 'offline') {
          return 'reconnected';
        }
        return prev;
      });
      setTimeout(() => {
        setNetworkStatus('online');
      }, 3000);
    };

    const handleReconnectAttempt = (attempt: number) => {
      setReconnectAttempts(attempt);
    };

    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);

    socket.on('disconnect', handleSocketDisconnect);
    socket.on('connect', handleSocketConnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
      socket.off('disconnect', handleSocketDisconnect);
      socket.off('connect', handleSocketConnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, []);

  if (networkStatus === 'online') return null;

  if (networkStatus === 'reconnected') {
    return (
      <div className="fixed top-0 left-0 w-full z-[99999] bg-emerald-600/95 backdrop-blur-md text-white px-4 py-3 shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3 border-b border-emerald-400/50 transition-all duration-500 animate-in slide-in-from-top-full">
        <Wifi className="w-5 h-5 animate-pulse" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-center">
          <span className="font-bold uppercase tracking-widest text-sm text-white">Connexion rétablie</span>
          <span className="text-xs text-emerald-100">La liaison avec le serveur de jeu est de nouveau active.</span>
        </div>
        <RefreshCw className="w-4 h-4 animate-spin ml-2 text-emerald-200" />
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 w-full z-[99999] bg-red-600/95 backdrop-blur-md text-white px-4 py-3 shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center gap-3 border-b border-red-400/50 transition-all duration-500">
      <WifiOff className="w-5 h-5 animate-pulse" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-center">
        <span className="font-bold uppercase tracking-widest text-sm text-white">Connexion perdue ou instable</span>
        <span className="text-xs text-red-100">
          Reconnexion au serveur… {reconnectAttempts > 0 && `(essai ${reconnectAttempts})`}
        </span>
      </div>
      <RefreshCw className="w-4 h-4 animate-spin ml-2 text-red-300" />
    </div>
  );
}
