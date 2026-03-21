import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, Users, Zap, Brain, Trophy, Target, Home, ChevronDown, ChevronUp, Settings2, XCircle } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { getUserBalance } from "../utils/userProfile";

const DIFF_LABEL_KEYS: Record<string, string> = { facile: "easy", moyen: "medium", difficile: "hard", expert: "expert" };
const BOT_NAMES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];

export function BotConfiguration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [numberOfBots, setNumberOfBots] = useState(1);
  const [difficulty, setDifficulty] = useState<"facile" | "moyen" | "difficile" | "expert">("moyen");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [botChips, setBotChips] = useState<number[]>([1000, 1000, 1000, 1000, 1000]);

  const difficulties = [
    { id: "facile" as const, icon: Target, color: "from-green-600 to-green-800", borderColor: "border-green-500", descKey: "easyDesc", traitKeys: ["traitPredictable", "traitErrors", "traitPassive"] },
    { id: "moyen" as const, icon: Brain, color: "from-blue-600 to-blue-800", borderColor: "border-blue-500", descKey: "mediumDesc", traitKeys: ["traitBalanced", "traitSomeBluffs", "traitBasic"] },
    { id: "difficile" as const, icon: Zap, color: "from-orange-600 to-orange-800", borderColor: "border-orange-500", descKey: "hardDesc", traitKeys: ["traitCalculated", "traitBluffs", "traitAdapt"] },
    { id: "expert" as const, icon: Trophy, color: "from-red-600 to-red-800", borderColor: "border-red-500", descKey: "expertDesc", traitKeys: ["traitUnpredictable", "traitAdvanced", "traitAggressive"] }
  ];

  const MIN_CHIPS = 100;
  const invalidBotChips = botChips.slice(0, numberOfBots).some((c) => c < MIN_CHIPS);

  const handleStartGame = () => {
    if (getUserBalance() <= 0) {
      addToast(t("botConfig.balanceRequired") || "Alimentez votre balance pour jouer.", "error");
      return;
    }
    if (invalidBotChips) {
      addToast(t("botConfig.minAmount100") || "Montant minimal 100 chips par bot.", "error");
      return;
    }
    const chipsParam = botChips.slice(0, numberOfBots).join(",");
    navigate(`/game?mode=bot&bots=${numberOfBots}&difficulty=${difficulty}&botChips=${chipsParam}`);
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-5xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <button
            onClick={() => navigate("/lobby")}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-semibold transition-all"
          >
            <Home className="w-5 h-5" />
            <span>{t('botConfig.home')}</span>
          </button>
        </div>

        {/* Titre */}
        <div className="flex items-center gap-4 mb-16">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center shadow-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">{t('botConfig.title')}</h1>
            <p className="text-gray-400">
              {t('botConfig.subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-12">
          {/* Nombre de bots */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-10">
            <div className="flex items-center gap-3 mb-10">
              <Users className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">{t('botConfig.numberOfBots')}</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setNumberOfBots(num)}
                  className={`relative p-6 sm:p-8 md:p-10 rounded-xl border-2 transition-all transform hover:scale-105 ${
                    numberOfBots === num
                      ? "bg-gradient-to-br from-purple-600 to-purple-800 border-purple-400 shadow-lg shadow-purple-600/50"
                      : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 ${
                      numberOfBots === num ? "text-white" : "text-gray-400"
                    }`}>
                      {num}
                    </div>
                    <div className={`text-sm font-semibold ${
                      numberOfBots === num ? "text-purple-200" : "text-gray-500"
                    }`}>
                      {num} {num > 1 ? "Bots" : "Bot"}
                    </div>
                  </div>
                  {numberOfBots === num && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-8 p-6 bg-slate-900/50 rounded-xl border border-slate-700">
              <p className="text-gray-400 text-sm">
                <span className="font-semibold text-white">{t('botConfig.playersAtTable')}</span> {t('botConfig.youAndBots', { count: numberOfBots, total: numberOfBots + 1 })}
              </p>
            </div>
          </div>

          {/* Niveau de difficulté */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-10">
            <div className="flex items-center gap-3 mb-10">
              <Brain className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">{t('botConfig.difficulty')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {difficulties.map((diff) => {
                const Icon = diff.icon;
                const isSelected = difficulty === diff.id;
                const labelKey = DIFF_LABEL_KEYS[diff.id] ?? diff.id;
                return (
                  <button
                    key={diff.id}
                    onClick={() => setDifficulty(diff.id)}
                    className={`relative p-10 rounded-xl border-2 transition-all transform hover:scale-105 text-left ${
                      isSelected
                        ? `bg-gradient-to-br ${diff.color} ${diff.borderColor} shadow-lg`
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected ? "bg-white/20" : "bg-slate-700"
                      }`}>
                        <Icon className={`w-6 h-6 ${isSelected ? "text-white" : "text-gray-400"}`} />
                      </div>

                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-1 ${
                          isSelected ? "text-white" : "text-gray-300"
                        }`}>
                          {t(`botConfig.${labelKey}`)}
                        </h3>
                        <p className={`text-sm mb-3 ${
                          isSelected ? "text-white/80" : "text-gray-500"
                        }`}>
                          {t(`botConfig.${diff.descKey}`)}
                        </p>

                        <div className="space-y-1">
                          {diff.traitKeys.map((traitKey, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isSelected ? "bg-white" : "bg-gray-600"
                              }`}></div>
                              <span className={`text-xs ${
                                isSelected ? "text-white/70" : "text-gray-600"
                              }`}>
                                {t(`botConfig.${traitKey}`)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bouton Commencer */}
          <button
            onClick={handleStartGame}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-bold text-xl py-10 rounded-2xl shadow-2xl transition-all transform hover:scale-105 border-2 border-purple-400"
          >
            <div className="flex items-center justify-center gap-3">
              <Bot className="w-8 h-8" />
              <span>{t('botConfig.startGameButton')}</span>
            </div>
          </button>

          {/* Voir plus — advanced bot config */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 text-sm font-medium py-2 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            <span>{showAdvanced ? t('botConfig.hideOptions') : t('botConfig.seeMore')}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-8 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <Settings2 className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-bold text-white">{t('botConfig.chipsPerBot')}</h3>
                <span className="text-xs text-gray-500 ml-auto">{t('botConfig.defaultChips')}</span>
              </div>
              {Array.from({ length: numberOfBots }, (_, i) => {
                const val = botChips[i];
                const isInvalid = val < MIN_CHIPS;
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white text-xs font-bold">
                        {BOT_NAMES[i]?.[0]}
                      </div>
                      <span className="text-gray-300 text-sm font-medium">Bot {BOT_NAMES[i]}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100000}
                        step={100}
                        value={val}
                        onChange={(e) => {
                          const raw = e.target.value === "" ? 0 : Number(e.target.value);
                          const val = Number.isNaN(raw) ? 0 : Math.min(100000, Math.max(0, raw));
                          setBotChips((prev) => {
                            const next = [...prev];
                            next[i] = val;
                            return next;
                          });
                        }}
                        className={`flex-1 bg-slate-700/50 border rounded-lg px-4 py-2 text-white text-sm focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          isInvalid ? "border-red-500 focus:border-red-500" : "border-slate-600 focus:border-purple-500"
                        }`}
                      />
                      {isInvalid && (
                        <div className="relative flex items-center gap-1">
                          <XCircle className="w-6 h-6 text-red-500 shrink-0" aria-hidden />
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-1 z-10 px-3 py-2 bg-slate-800 border border-red-500 rounded-lg shadow-xl text-red-400 text-sm font-medium whitespace-nowrap">
                            {t("botConfig.minAmount100")}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-gray-500 text-xs min-w-[20px]">chips</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Résumé */}
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700 p-10 mb-16">
            <h3 className="text-white font-bold text-lg mb-6">{t('botConfig.configSummary')}</h3>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <span className="text-gray-400">{t('botConfig.opponents')}</span>
                <span className="text-white font-bold ml-2">{numberOfBots} {numberOfBots > 1 ? "bots" : "bot"}</span>
              </div>
              <div>
                <span className="text-gray-400">{t('botConfig.difficultyLabel')}</span>
                <span className="text-white font-bold ml-2">{t(`botConfig.${DIFF_LABEL_KEYS[difficulty] ?? difficulty}`)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}