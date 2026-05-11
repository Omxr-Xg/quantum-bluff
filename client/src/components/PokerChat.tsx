import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, MessagesSquare, Send, Sparkles, X } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";
import {
  CHAT_REACTION_PREFIX,
  ChatReactionIcon,
  QUICK_MESSAGE_ICONS,
} from "./chatReactionDisplay";

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

  const pokerReactions: { labelKey: string }[] = [
    { labelKey: "cards" },
    { labelKey: "casino" },
    { labelKey: "money" },
    { labelKey: "onFire" },
    { labelKey: "cool" },
    { labelKey: "thinking" },
    { labelKey: "nervous" },
    { labelKey: "king" },
    { labelKey: "fast" },
    { labelKey: "precise" },
    { labelKey: "gg" },
    { labelKey: "strong" },
    { labelKey: "luck" },
    { labelKey: "diamond" },
    { labelKey: "trophy" },
    { labelKey: "party" },
    { labelKey: "shocked" },
    { labelKey: "mindBlown" },
    { labelKey: "cold" },
    { labelKey: "rich" },
  ];

  const quickMessages: { textKey: string }[] = [
    { textKey: "wellPlayed" },
    { textKey: "allIn" },
    { textKey: "bluffing" },
    { textKey: "whatAHand" },
    { textKey: "luckyShot" },
    { textKey: "heatingUp" },
    { textKey: "impressive" },
    { textKey: "ggWp" },
    { textKey: "risky" },
    { textKey: "easy" },
    { textKey: "oops" },
    { textKey: "incredible" },
  ];

  const handleReactionClick = (labelKey: string) => {
    onSendMessage(`${CHAT_REACTION_PREFIX}${labelKey}`, "emoji");
    onToggle();
  };

  const handleMessageClick = (message: string) => {
    onSendMessage(message, "text");
    onToggle();
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+12.75rem)] z-[100] flex justify-start md:inset-x-auto md:left-6 md:bottom-44"
          initial={{ opacity: 0, y: 18, x: isMobile ? 0 : -18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, x: isMobile ? 0 : -16, scale: 0.97 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
      <div className={`pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-blue-300/45 bg-gradient-to-br from-slate-950/96 via-slate-900/96 to-blue-950/92 shadow-[0_24px_70px_rgba(2,6,23,0.58),0_0_34px_rgba(59,130,246,0.20)] backdrop-blur-xl max-h-[min(56vh,28rem)] ${
        isMobile ? "w-[calc(100vw-1.5rem)]" : "w-[min(24rem,calc(100vw-2rem))]"
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 shrink-0" />
            <div>
              <h3 className="text-white font-bold text-base sm:text-lg">{t("pokerChat.title")}</h3>
              <p className="text-blue-300 text-[10px] sm:text-xs">{t("pokerChat.subtitle")}</p>
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

        <div className="flex border-b border-slate-700 shrink-0">
          <button
            onClick={() => setActiveTab("emojis")}
            className={`flex-1 py-3 px-3 sm:px-4 font-semibold text-sm sm:text-base transition-all touch-manipulation min-h-[48px] ${
              activeTab === "emojis"
                ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {t("pokerChat.tabEmojis")}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`flex-1 py-3 px-3 sm:px-4 font-semibold text-sm sm:text-base transition-all touch-manipulation min-h-[48px] ${
              activeTab === "messages"
                ? "text-blue-400 border-b-2 border-blue-400 bg-slate-800/50"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <MessagesSquare className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {t("pokerChat.tabMessages")}
            </span>
          </button>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {activeTab === "emojis" ? (
            <div className={`grid gap-1.5 sm:gap-2 ${isMobile ? "grid-cols-5" : "grid-cols-6"}`}>
              {pokerReactions.map((item) => {
                const label = t(`pokerChat.emoji.${item.labelKey}`);
                const payload = `${CHAT_REACTION_PREFIX}${item.labelKey}`;
                return (
                  <button
                    key={item.labelKey}
                    onClick={() => handleReactionClick(item.labelKey)}
                    className="group relative bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl p-2 sm:p-3 transition-all active:scale-95 border border-slate-700 hover:border-blue-500 touch-manipulation min-h-[44px] sm:min-h-[52px] flex items-center justify-center"
                    title={label}
                    aria-label={label}
                  >
                    <ChatReactionIcon
                      content={payload}
                      className={`${isMobile ? "h-7 w-7" : "h-9 w-9"} text-amber-200/95`}
                    />
                    {!isMobile && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {quickMessages.map((item) => {
                const text = t(`pokerChat.quick.${item.textKey}`);
                const Icon = QUICK_MESSAGE_ICONS[item.textKey];
                return (
                  <button
                    key={item.textKey}
                    onClick={() => handleMessageClick(text)}
                    className="w-full group bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl p-3 transition-all active:scale-[0.98] border border-slate-700 hover:border-blue-500 flex items-center justify-between touch-manipulation min-h-[48px]"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {Icon ? (
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0 text-blue-300" aria-hidden />
                      ) : null}
                      <span className="text-white font-semibold text-sm sm:text-base truncate">{text}</span>
                    </div>
                    <Send className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-2 sm:p-3 border-t border-slate-700 bg-slate-800/50 shrink-0 flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs text-gray-400 truncate">{t("pokerChat.footerHint")}</span>
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 font-semibold text-xs sm:text-sm">{t("pokerChat.online")}</span>
          </div>
        </div>
      </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
