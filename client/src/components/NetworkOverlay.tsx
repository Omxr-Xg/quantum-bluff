import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { socket } from '../services/socket';

// Redux
import { useDispatch } from 'react-redux';
import { setOnlineStatus } from '../store/slices/networkSlice';

export function NetworkOverlay() {
  const dispatch = useDispatch();
  
  // États locaux pour l'affichage de la barre
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'reconnected'>('online');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    // --- 1. LOGIQUE DU NAVIGATEUR (INTERNET GLOBAL) ---

    const handleBrowserOffline = () => {
      setNetworkStatus('offline');
      dispatch(setOnlineStatus(false)); // ❌ Bloque le jeu dans Redux
    };

    const handleBrowserOnline = () => {
      setNetworkStatus('reconnected');
      dispatch(setOnlineStatus(true));  // ✅ Débloque le jeu dans Redux
      
      // On cache la bannière verte après 3 secondes
      setTimeout(() => {
        setNetworkStatus('online');
      }, 3000);
    };

    // --- 2. LOGIQUE DU SOCKET (CONNEXION AU SERVEUR DE JEU) ---

    const handleSocketDisconnect = (reason: string) => {
      // On ne bloque que si c'est une déconnexion involontaire
      if (reason !== "io client disconnect") {
        setNetworkStatus('offline');
        dispatch(setOnlineStatus(false));
      }
    };

    const handleSocketConnect = () => {
      setReconnectAttempts(0);
      
      // Si on était en rouge, on passe au vert
      setNetworkStatus((prev) => {
        if (prev === 'offline') {
          dispatch(setOnlineStatus(true));
          return 'reconnected';
        }
        return prev;
      });

      // On revient à l'état invisible après un moment
      setTimeout(() => {
        setNetworkStatus('online');
      }, 3000);
    };

    const handleReconnectAttempt = (attempt: number) => {
      setReconnectAttempts(attempt);
      // Pendant qu'on tente de se reconnecter, le jeu doit rester bloqué
      dispatch(setOnlineStatus(false));
    };

    // --- 3. MISE EN PLACE DES ÉCOUTEURS ---

    // Listeners du navigateur
    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);

    // Listeners du Socket
    socket.on('disconnect', handleSocketDisconnect);
    socket.on('connect', handleSocketConnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      // Nettoyage complet
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
      socket.off('disconnect', handleSocketDisconnect);
      socket.off('connect', handleSocketConnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [dispatch]);

  // --- RENDU VISUEL ---

  // Si on est en ligne, on ne rend absolument rien (Zéro impact sur le DOM)
  if (networkStatus === 'online') return null;

  // Bannière verte : Connexion rétablie
  if (networkStatus === 'reconnected') {
    return (
      <div className="fixed top-0 left-0 w-full z-[99999] bg-emerald-600/95 backdrop-blur-md text-white px-4 py-3 shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center justify-center gap-3 border-b border-emerald-400/50 transition-all duration-500 animate-in slide-in-from-top-full">
        <Wifi className="w-5 h-5 animate-pulse" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-center">
          <span className="font-bold uppercase tracking-widest text-sm text-white">Connexion rétablie</span>
          <span className="text-xs text-emerald-100">L'accès aux tables de jeu est débloqué.</span>
        </div>
        <RefreshCw className="w-4 h-4 animate-spin ml-2 text-emerald-200" />
      </div>
    );
  }

  // Bannière rouge : Connexion perdue
  return (
    <div className="fixed top-0 left-0 w-full z-[99999] bg-red-600/95 backdrop-blur-md text-white px-4 py-3 shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center gap-3 border-b border-red-400/50 transition-all duration-500">
      <WifiOff className="w-5 h-5 animate-pulse" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-center">
        <span className="font-bold uppercase tracking-widest text-sm text-white">Alerte : Connexion perdue</span>
        <span className="text-xs text-red-100">
          Les mises sont bloquées. Reconnexion... {reconnectAttempts > 0 && `(Essai ${reconnectAttempts})`}
        </span>
      </div>
      <RefreshCw className="w-4 h-4 animate-spin ml-2 text-red-300" />
    </div>
  );
}