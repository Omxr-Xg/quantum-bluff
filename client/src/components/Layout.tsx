import { ReactNode, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useSocket } from "../contexts/SocketContext";
import { useToast } from "../contexts/ToastContext";
import { Toast } from "./Toast";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { socket, isConnected, connect } = useSocket();
  const { toasts, removeToast } = useToast();
  const [notification, setNotification] = useState<{
    id: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendRequestReceived = (payload: any) => {
      console.log("GLOBAL FRIEND_REQUEST_RECEIVED:", payload);

      setNotification({
        id: Date.now(),
        message: `Nouvelle demande d'ami de ${payload?.sender?.username || "un joueur"}`
      });
    };

    const handleFriendRequestAccepted = () => {
      console.log("GLOBAL FRIEND_REQUEST_ACCEPTED");

      setNotification({
        id: Date.now(),
        message: "Votre demande d'ami a été acceptée"
      });
    };

    socket.on("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
    socket.on("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);

    return () => {
      socket.off("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
      socket.off("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
    };
  }, [socket]);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  console.log("LAYOUT SOCKET STATUS:", { hasSocket: !!socket, isConnected });
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm w-[calc(100%-2rem)] sm:w-full">
          <div className="bg-slate-900/95 border border-blue-500 shadow-2xl rounded-2xl px-4 py-4 backdrop-blur-md animate-in slide-in-from-right-5 duration-300">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-300" />
              </div>

              <div className="flex-1">
                <p className="text-white font-semibold text-sm mb-1">
                  Notification
                </p>
                <p className="text-slate-200 text-sm">
                  {notification.message}
                </p>
              </div>

              <button
                onClick={() => setNotification(null)}
                className="shrink-0 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen w-full">
        {children}
      </div>
    </div>
  );
}