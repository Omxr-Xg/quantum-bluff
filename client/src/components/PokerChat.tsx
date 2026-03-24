import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Send, X } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";

interface PokerChatProps {
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (message: string, type: "emoji" | "text") => void;
}

export function PokerChat({ isOpen, onToggle, onSendMessage }: PokerChatProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"emojis" | "messages">("emojis");
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";

  // Emojis liés au poker
  const pokerEmojis = [
    { emoji: "🃏", label: "Cartes" },
    { emoji: "🎰", label: "Casino" },
    { emoji: "💰", label: "Argent" },
    { emoji: "🔥", label: "En feu" },
    { emoji: "😎", label: "Cool" },
    { emoji: "🤔", label: "Réflexion" },
    { emoji: "😅", label: "Nerveux" },
    { emoji: "👑", label: "Roi" },
    { emoji: "⚡", label: "Rapide" },
    { emoji: "🎯", label: "Précis" },
    { emoji: "🤝", label: "GG" },
    { emoji: "💪", label: "Fort" },
    { emoji: "🎲", label: "Chance" },
    { emoji: "💎", label: "Diamant" },
    { emoji: "🏆", label: "Trophée" },
    { emoji: "🎉", label: "Fête" },
    { emoji: "😱", label: "Choqué" },
    { emoji: "🤯", label: "Explosé" },
    { emoji: "🥶", label: "Glacé" },
    { emoji: "🤑", label: "Riche" },
  ];

  // Messages rapides liés au poker
  const quickMessages = [
    { text: "Bien joué !", icon: "👏" },
    { text: "All-in ! 🚀", icon: "🚀" },
    { text: "Je bluffe ?", icon: "🤫" },
    { text: "Quelle main !", icon: "🔥" },
    { text: "Coup de chance", icon: "🍀" },
    { text: "Ça chauffe", icon: "🌶️" },
    { text: "Impressionnant", icon: "😮" },
    { text: "GG WP", icon: "🤝" },
    { text: "Risqué...", icon: "⚠️" },
    { text: "Facile", icon: "😎" },
    { text: "Oups...", icon: "😬" },
    { text: "Incroyable", icon: "🤩" },
  ];

  const handleEmojiClick = (emoji: string) => {
    onSendMessage(emoji, "emoji");
    onToggle();
  };

  const handleMessageClick = (message: string) => {
    onSendMessage(message, "text");
    onToggle();
  };

  if (!isOpen) return null; // Ne rien rendre si c'est fermé

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col items-center p-2 sm:p-4 pb-[env(safe-area-inset-bottom,0)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`bg-gradient-to-br from-slate-900/98 to-slate-800/98 backdrop-blur-md rounded-t-2xl border-2 border-t border-x border-blue-500 shadow-2xl flex flex-col max-h-[70vh] sm:max-h-[65vh] ${
        isMobile ? "w-full max-w-full" : "w-full max-w-md"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 shrink-0" />
            <div>
              <h3 className="text-white font-bold text-base sm:text-lg">Messages Rapides</h3>
              <p className="text-blue-300 text-[10px] sm:text-xs">Communiquez avec style</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-2 -m-2 text-gray-400 hover:text-white transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            title={t('hiddenBets.close')}
            aria-label={t('hiddenBets.close')}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab("emojis")}
            className={`flex-1 py-3 px-3 sm:px-4 font-semibold text-sm sm:text-base transition-all touch-manipulation min-h-[48px] ${
              activeTab === "emojis"
                ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🎰 Emojis
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 py-3 px-3 sm:px-4 font-semibold text-sm sm:text-base transition-all touch-manipulation min-h-[48px] ${
              activeTab === "messages"
                ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            💬 Messages
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="p-3 sm:p-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {activeTab === "emojis" ? (
            <div className={`grid gap-1.5 sm:gap-2 ${isMobile ? "grid-cols-5" : "grid-cols-6"}`}>
              {pokerEmojis.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiClick(item.emoji)}
                  className="group relative bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl p-2 sm:p-3 transition-all active:scale-95 border border-slate-700 hover:border-blue-500 touch-manipulation min-h-[44px] sm:min-h-[52px] flex items-center justify-center"
                  title={item.label}
                  aria-label={item.label}
                >
                  <span className={`${isMobile ? "text-2xl" : "text-3xl"}`}>{item.emoji}</span>
                  {!isMobile && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {quickMessages.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleMessageClick(item.text)}
                  className="w-full group bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl p-3 transition-all active:scale-[0.98] border border-slate-700 hover:border-blue-500 flex items-center justify-between touch-manipulation min-h-[48px]"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl shrink-0">{item.icon}</span>
                    <span className="text-white font-semibold text-sm sm:text-base truncate">{item.text}</span>
                  </div>
                  <Send className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer - En bas, facilement accessible */}
        <div className="p-2 sm:p-3 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl shrink-0 flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs text-gray-400 truncate">Envoyez des messages instantanés</span>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 font-semibold text-xs sm:text-sm">En ligne</span>
          </div>
        </div>
      </div>
    </div>
  );
}