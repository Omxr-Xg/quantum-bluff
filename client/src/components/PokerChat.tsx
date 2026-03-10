import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

interface PokerChatProps {
  isOpen: boolean;
  onToggle: () => void;
  onSendMessage: (message: string, type: "emoji" | "text") => void;
}

export function PokerChat({ isOpen, onToggle, onSendMessage }: PokerChatProps) {
  const [activeTab, setActiveTab] = useState<"emojis" | "messages">("emojis");

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
    // AJOUT MAJEUR : Le positionnement `fixed` pour l'ancrer à l'écran
    // `top-20` et `right-8` le placent juste sous ton bouton de chat
    <div className="fixed top-20 right-8 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md rounded-2xl border-2 border-blue-500 shadow-2xl w-[350px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-blue-400" />
            <div>
              <h3 className="text-white font-bold text-lg">Messages Rapides</h3>
              <p className="text-blue-300 text-xs">Communiquez avec style</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab("emojis")}
            className={`flex-1 py-3 px-4 font-semibold transition-all ${
              activeTab === "emojis"
                ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            🎰 Emojis
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 py-3 px-4 font-semibold transition-all ${
              activeTab === "messages"
                ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            💬 Messages
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4 max-h-[350px] overflow-y-auto">
          {activeTab === "emojis" ? (
            // Grille d'emojis
            <div className="grid grid-cols-5 gap-2">
              {pokerEmojis.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleEmojiClick(item.emoji)}
                  className="group relative bg-slate-800 hover:bg-slate-700 rounded-xl p-3 transition-all transform hover:scale-110 active:scale-95 border border-slate-700 hover:border-blue-500"
                  title={item.label}
                >
                  <span className="text-3xl">{item.emoji}</span>
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Liste de messages rapides
            <div className="space-y-2">
              {quickMessages.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleMessageClick(item.text)}
                  className="w-full group bg-slate-800 hover:bg-slate-700 rounded-xl p-3 transition-all transform hover:scale-105 active:scale-95 border border-slate-700 hover:border-blue-500 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-white font-semibold">{item.text}</span>
                  </div>
                  <Send className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Envoyez des messages instantanés</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-semibold">En ligne</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}