import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChatReactionIcon, isChatReactionId } from "./chatReactionDisplay";

interface ChatMessage {
  id: number | string;
  player: string;
  content: string;
  type: "emoji" | "text";
  timestamp: number;
}

interface MessageFeedProps {
  messages: ChatMessage[];
}

// 1. NOUVEAU SOUS-COMPOSANT : Gère la vie d'un seul message (entrée, attente, sortie animée)
function ToastMessage({
  message,
  onRemove,
}: {
  message: ChatMessage;
  onRemove: (id: number | string) => void;
}) {
  const { t } = useTranslation();
  const [isLeaving, setIsLeaving] = useState(false);
  const displayName = message.player === "Vous" || message.player === "you" ? t('game.you') : message.player;
  const isMe = message.player === "Vous" || message.player === "you";

  useEffect(() => {
    // Déclenche l'animation de sortie après 3.5 secondes
    const leaveTimer = setTimeout(() => {
      setIsLeaving(true);
    }, 3500);

    // Supprime définitivement le composant après 4 secondes (laisse 500ms pour l'animation)
    const removeTimer = setTimeout(() => {
      onRemove(message.id);
    }, 4000);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, [message.id, onRemove]);

  return (
    <div
      className={`transition-all duration-500 ease-in-out transform origin-left pointer-events-auto ${
        isLeaving
          ? "opacity-0 -translate-x-10 scale-90 blur-sm" // EFFET DE SORTIE : Glisse à gauche, rétrécit, flou
          : "animate-in slide-in-from-left-8 fade-in duration-300 opacity-100 translate-x-0 scale-100" // EFFET D'ENTRÉE
      }`}
    >
      {/* Ton design UI original pour la bulle de message */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl px-4 py-3 max-w-[300px]">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {displayName.charAt(0)}
            </span>
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-semibold mb-1 ${isMe ? "text-green-400" : "text-blue-400"}`}>
              {displayName}
            </div>
            <div
              className={`${
                message.type === "emoji" || isChatReactionId(message.content)
                  ? "flex items-center justify-start min-h-[2.5rem]"
                  : "text-white text-sm font-medium"
              }`}
            >
              {message.type === "emoji" || isChatReactionId(message.content) ? (
                <ChatReactionIcon content={message.content} />
              ) : (
                message.content
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. COMPOSANT PRINCIPAL : Gère la liste des messages
export function MessageFeed({ messages }: MessageFeedProps) {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  // Quand un nouveau message arrive depuis Game.tsx
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      setLocalMessages((prev) => {
        // Évite les doublons
        if (prev.some((m) => m.id === latestMessage.id)) return prev;
        // Ajoute le nouveau message et garde seulement les 3 derniers
        return [...prev, latestMessage].slice(-3);
      });
    }
  }, [messages]);

  // Fonction passée aux enfants pour qu'ils s'auto-détruisent
  const handleRemove = useCallback((id: number | string) => {
    setLocalMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  if (localMessages.length === 0) return null;

  return (
    <div className="fixed top-24 left-4 z-50 space-y-3 pointer-events-none flex flex-col">
      {localMessages.map((message) => (
        <ToastMessage key={message.id} message={message} onRemove={handleRemove} />
      ))}
    </div>
  );
}