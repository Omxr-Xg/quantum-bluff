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
    {
      id: "facile" as const,
      icon: Target,
      selectedCard: "border-emerald-300/30 bg-emerald-950/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_44px_rgba(6,78,59,0.26)] ring-1 ring-emerald-300/15",
      idleCard: "hover:border-emerald-300/25 hover:bg-emerald-950/18",
      selectedIconWrap: "border-emerald-300/25 bg-emerald-400/10",
      selectedIcon: "text-emerald-200",
      selectedTitle: "text-emerald-100",
      selectedDot: "bg-emerald-300",
      descKey: "easyDesc",
      traitKeys: ["traitPredictable", "traitErrors", "traitPassive"],
    },
    {
      id: "moyen" as const,
      icon: Brain,
      selectedCard: "border-blue-300/30 bg-blue-950/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_44px_rgba(30,64,175,0.25)] ring-1 ring-blue-300/15",
      idleCard: "hover:border-blue-300/25 hover:bg-blue-950/20",
      selectedIconWrap: "border-blue-300/25 bg-blue-400/10",
      selectedIcon: "text-blue-200",
      selectedTitle: "text-blue-100",
      selectedDot: "bg-blue-300",
      descKey: "mediumDesc",
      traitKeys: ["traitBalanced", "traitSomeBluffs", "traitBasic"],
    },
    {
      id: "difficile" as const,
      icon: Zap,
      selectedCard: "border-orange-300/30 bg-orange-950/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_44px_rgba(154,52,18,0.24)] ring-1 ring-orange-300/15",
      idleCard: "hover:border-orange-300/25 hover:bg-orange-950/16",
      selectedIconWrap: "border-orange-300/25 bg-orange-400/10",
      selectedIcon: "text-orange-200",
      selectedTitle: "text-orange-100",
      selectedDot: "bg-orange-300",
      descKey: "hardDesc",
      traitKeys: ["traitCalculated", "traitBluffs", "traitAdapt"],
    },
    {
      id: "expert" as const,
      icon: Trophy,
      selectedCard: "border-rose-300/30 bg-rose-950/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_44px_rgba(136,19,55,0.25)] ring-1 ring-rose-300/15",
      idleCard: "hover:border-rose-300/25 hover:bg-rose-950/18",
      selectedIconWrap: "border-rose-300/25 bg-rose-400/10",
      selectedIcon: "text-rose-200",
      selectedTitle: "text-rose-100",
      selectedDot: "bg-rose-300",
      descKey: "expertDesc",
      traitKeys: ["traitUnpredictable", "traitAdvanced", "traitAggressive"],
    }
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
    <div className="relative min-h-screen w-full overflow-auto bg-[#020716] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_40%,rgba(14,116,144,0.10),transparent_48%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-950/40 blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-cyan-700/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-950/28 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.26) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>
      <div className="relative z-10 w-full min-w-0 px-4 pb-12 pt-20 sm:px-8 sm:pb-16 sm:pt-24 lg:px-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between sm:mb-10">
          <button
            onClick={() => navigate("/lobby")}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.08]"
          >
            <Home className="w-5 h-5" />
            <span>{t('botConfig.home')}</span>
          </button>
        </div>

        {/* Titre */}
        <div className="mb-10 flex items-center gap-4 sm:mb-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-blue-950/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_18px_44px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <Bot className="w-8 h-8 text-blue-200" />
          </div>
          <div>
            <h1 className="mb-1 bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-200 bg-clip-text text-4xl font-bold text-transparent">{t('botConfig.title')}</h1>
            <p className="text-gray-400">
              {t('botConfig.subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-12">
          {/* Nombre de bots */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-10">
              <Users className="w-6 h-6 text-blue-200" />
              <h2 className="text-2xl font-bold text-white">{t('botConfig.numberOfBots')}</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setNumberOfBots(num)}
                  className={`relative rounded-xl border p-6 transition-all hover:-translate-y-0.5 sm:p-8 md:p-10 ${
                    numberOfBots === num
                      ? "border-blue-300/25 bg-blue-950/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_18px_44px_rgba(15,23,42,0.34)] ring-1 ring-blue-300/15"
                      : "border-white/10 bg-white/[0.045] backdrop-blur-md hover:border-white/20 hover:bg-white/[0.075]"
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 ${
                      numberOfBots === num ? "text-white" : "text-gray-400"
                    }`}>
                      {num}
                    </div>
                    <div className={`text-sm font-semibold ${
                      numberOfBots === num ? "text-blue-200" : "text-gray-500"
                    }`}>
                      {num} {num > 1 ? "Bots" : "Bot"}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="text-gray-400 text-sm">
                <span className="font-semibold text-white">{t('botConfig.playersAtTable')}</span> {t('botConfig.youAndBots', { count: numberOfBots, total: numberOfBots + 1 })}
              </p>
            </div>
          </div>

          {/* Niveau de difficulté */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-10">
              <Brain className="w-6 h-6 text-blue-200" />
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
                    className={`relative rounded-xl border p-10 text-left transition-all hover:-translate-y-0.5 ${
                      isSelected
                        ? diff.selectedCard
                        : `border-white/10 bg-white/[0.045] backdrop-blur-md ${diff.idleCard}`
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                        isSelected ? diff.selectedIconWrap : "border-white/10 bg-white/[0.05]"
                      }`}>
                        <Icon className={`w-6 h-6 ${isSelected ? diff.selectedIcon : "text-gray-400"}`} />
                      </div>

                      <div className="flex-1">
                        <h3 className={`text-xl font-bold mb-1 ${
                          isSelected ? diff.selectedTitle : "text-gray-300"
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
                                isSelected ? diff.selectedDot : "bg-gray-600"
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
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bouton Commencer */}
          <button
            onClick={handleStartGame}
            className="w-full rounded-2xl border border-blue-300/20 bg-blue-950/75 py-10 text-xl font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_22px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-blue-200/30 hover:bg-blue-900/80"
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
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.055] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-4">
                <Settings2 className="w-5 h-5 text-blue-200" />
                <h3 className="text-lg font-bold text-white">{t('botConfig.chipsPerBot')}</h3>
                <span className="text-xs text-gray-500 ml-auto">{t('botConfig.defaultChips')}</span>
              </div>
              {Array.from({ length: numberOfBots }, (_, i) => {
                const val = botChips[i];
                const isInvalid = val < MIN_CHIPS;
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-300/15 bg-blue-950/70 text-xs font-bold text-blue-100">
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
                        className={`flex-1 rounded-lg border bg-white/[0.055] px-4 py-2 text-sm text-white transition-colors [appearance:textfield] backdrop-blur-md focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                          isInvalid ? "border-red-500 focus:border-red-500" : "border-white/10 focus:border-blue-300/40"
                        }`}
                      />
                      {isInvalid && (
                        <div className="relative flex items-center gap-1">
                          <XCircle className="w-6 h-6 text-red-500 shrink-0" aria-hidden />
                          <div className="absolute left-full top-1/2 z-10 ml-1 -translate-y-1/2 whitespace-nowrap rounded-lg border border-red-500 bg-slate-950/90 px-3 py-2 text-sm font-medium text-red-400 shadow-xl backdrop-blur-md">
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
          <div className="mb-16 rounded-xl border border-white/10 bg-white/[0.045] p-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
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
