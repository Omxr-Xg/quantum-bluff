import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, Wifi, X, CheckCircle2 } from 'lucide-react';
import { socket } from '../services/socket';

export function NetworkOverlay() {
  const { t } = useTranslation();
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'reconnected'>('online');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  /** Masque la bannière rouge tant que la coupure dure ; réinitialisé à la reconnexion. */
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  /** Masque la carte verte « connexion rétablie » ; réinitialisé à la prochaine coupure. */
  const [reconnectedDismissed, setReconnectedDismissed] = useState(false);

  useEffect(() => {
    const handleBrowserOffline = () => {
      setOfflineDismissed(false);
      setReconnectedDismissed(false);
      setNetworkStatus('offline');
    };

    const handleBrowserOnline = () => {
      setOfflineDismissed(false);
      setNetworkStatus('reconnected');
      setTimeout(() => {
        setNetworkStatus('online');
      }, 3000);
    };

    const handleSocketDisconnect = (reason: string) => {
      if (reason === 'io client disconnect') return;
      setNetworkStatus((prev) => {
        if (prev === 'online' || prev === 'reconnected') {
          setOfflineDismissed(false);
        }
        return 'offline';
      });
    };

    const handleSocketConnect = () => {
      setReconnectAttempts(0);
      setOfflineDismissed(false);
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

    const handleConnectError = () => {
      if (!socket.connected) {
        setNetworkStatus((prev) => {
          if (prev === 'online' || prev === 'reconnected') {
            setOfflineDismissed(false);
          }
          return 'offline';
        });
      }
    };

    const handleReconnectAttempt = (attempt: number) => {
      setReconnectAttempts(attempt);
    };

    window.addEventListener('offline', handleBrowserOffline);
    window.addEventListener('online', handleBrowserOnline);

    socket.on('disconnect', handleSocketDisconnect);
    socket.on('connect', handleSocketConnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      window.removeEventListener('offline', handleBrowserOffline);
      window.removeEventListener('online', handleBrowserOnline);
      socket.off('disconnect', handleSocketDisconnect);
      socket.off('connect', handleSocketConnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, []);

  useEffect(() => {
    if (networkStatus === 'reconnected') {
      setReconnectedDismissed(false);
    }
  }, [networkStatus]);

  if (networkStatus === 'online') return null;

  if (networkStatus === 'reconnected') {
    if (reconnectedDismissed) {
      return null;
    }
    return (
      <div
        className="fixed top-4 left-1/2 z-[99999] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300"
        role="status"
        aria-live="polite"
      >
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-950/98 via-teal-950/95 to-emerald-950/98 text-white shadow-[0_16px_48px_-8px_rgba(6,78,59,0.55),0_0_0_1px_rgba(52,211,153,0.18)_inset] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(52,211,153,0.2),transparent)]" />
          <div className="relative flex gap-3 px-4 py-3.5 pr-12">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600/35 ring-1 ring-emerald-400/35">
              <Wifi className="h-5 w-5 text-emerald-100" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold tracking-tight text-emerald-50">
                {t('networkOverlay.reconnectedTitle')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-200/95">
                {t('networkOverlay.reconnectedHint')}
              </p>
            </div>
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-300/95" aria-hidden />
          </div>
          <button
            type="button"
            onClick={() => setReconnectedDismissed(true)}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-emerald-200/90 transition-colors hover:bg-emerald-900/55 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80"
            aria-label={t('networkOverlay.closeLabel')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (networkStatus !== 'offline') {
    return null;
  }

  if (offlineDismissed) return null;

  return (
    <div
      className="fixed top-4 left-1/2 z-[99999] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-top-2 duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div className="relative overflow-hidden rounded-2xl border border-red-500/50 bg-gradient-to-br from-red-950/98 via-rose-950/95 to-red-950/98 text-white shadow-[0_16px_48px_-8px_rgba(127,29,29,0.65),0_0_0_1px_rgba(248,113,113,0.15)_inset] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(248,113,113,0.22),transparent)]" />
        <div className="relative flex gap-3 px-4 py-3.5 pr-12">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600/35 ring-1 ring-red-400/30">
            <WifiOff className="h-5 w-5 text-red-100" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold tracking-tight text-red-50">
              {t('networkOverlay.serverUnreachableTitle')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-red-200/90">
              {t('networkOverlay.serverUnreachableHint')}
              <br />
              {reconnectAttempts > 0
                ? t('networkOverlay.reconnectWithAttempt', { count: reconnectAttempts })
                : t('networkOverlay.reconnectAuto')}
            </p>
          </div>
          <RefreshCw className="mt-1 h-4 w-4 shrink-0 animate-spin text-red-300/90" aria-hidden />
        </div>
        <button
          type="button"
          onClick={() => setOfflineDismissed(true)}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-red-200/80 transition-colors hover:bg-red-900/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80"
          aria-label={t('networkOverlay.closeLabel')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
