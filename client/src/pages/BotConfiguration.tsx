import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, Users, Zap, Brain, Trophy, Target, ChevronDown, ChevronUp, Settings2, XCircle } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { getUserBalance } from "../utils/userProfile";
import { apiUrl } from "../utils/apiBase";

const DIFF_LABEL_KEYS: Record<string, string> = { facile: "easy", moyen: "medium", difficile: "hard", expert: "expert" };
const BOT_NAMES = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
type Difficulty = "facile" | "moyen" | "difficile" | "expert";

export function BotConfiguration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [numberOfBots, setNumberOfBots] = useState<number | null>(1);
  const [difficulty, setDifficulty] = useState<Difficulty | null>("moyen");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [botChips, setBotChips] = useState<number[]>([1000, 1000, 1000, 1000, 1000]);
  const DEFAULT_BOT_CHIPS = [1000, 1000, 1000, 1000, 1000];

  const difficulties = [
    {
      id: "facile" as const,
      icon: Target,
      selectedCard: "border-emerald-200/45 bg-emerald-950/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_0_34px_rgba(52,211,153,0.20),0_20px_54px_rgba(6,78,59,0.32)] ring-1 ring-emerald-300/30",
      idleCard: "hover:border-emerald-300/35 hover:bg-emerald-950/20 hover:shadow-[0_0_24px_rgba(52,211,153,0.10)]",
      selectedIconWrap: "border-emerald-200/45 bg-emerald-400/14 shadow-[0_0_18px_rgba(52,211,153,0.16)]",
      selectedIcon: "text-emerald-200",
      selectedTitle: "text-emerald-100",
      selectedDot: "bg-emerald-300",
      descKey: "easyDesc",
      traitKeys: ["traitPredictable", "traitErrors", "traitPassive"],
    },
    {
      id: "moyen" as const,
      icon: Brain,
      selectedCard: "border-blue-200/45 bg-blue-950/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_0_36px_rgba(96,165,250,0.22),0_20px_54px_rgba(30,64,175,0.32)] ring-1 ring-blue-300/30",
      idleCard: "hover:border-blue-300/35 hover:bg-blue-950/22 hover:shadow-[0_0_24px_rgba(96,165,250,0.12)]",
      selectedIconWrap: "border-blue-200/45 bg-blue-400/14 shadow-[0_0_18px_rgba(96,165,250,0.18)]",
      selectedIcon: "text-blue-200",
      selectedTitle: "text-blue-100",
      selectedDot: "bg-blue-300",
      descKey: "mediumDesc",
      traitKeys: ["traitBalanced", "traitSomeBluffs", "traitBasic"],
    },
    {
      id: "difficile" as const,
      icon: Zap,
      selectedCard: "border-orange-200/45 bg-orange-950/38 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_0_34px_rgba(251,146,60,0.20),0_20px_54px_rgba(154,52,18,0.30)] ring-1 ring-orange-300/30",
      idleCard: "hover:border-orange-300/35 hover:bg-orange-950/18 hover:shadow-[0_0_24px_rgba(251,146,60,0.11)]",
      selectedIconWrap: "border-orange-200/45 bg-orange-400/14 shadow-[0_0_18px_rgba(251,146,60,0.16)]",
      selectedIcon: "text-orange-200",
      selectedTitle: "text-orange-100",
      selectedDot: "bg-orange-300",
      descKey: "hardDesc",
      traitKeys: ["traitCalculated", "traitBluffs", "traitAdapt"],
    },
    {
      id: "expert" as const,
      icon: Trophy,
      selectedCard: "border-rose-200/45 bg-rose-950/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_0_36px_rgba(251,113,133,0.22),0_20px_54px_rgba(136,19,55,0.32)] ring-1 ring-rose-300/30",
      idleCard: "hover:border-rose-300/35 hover:bg-rose-950/20 hover:shadow-[0_0_24px_rgba(251,113,133,0.12)]",
      selectedIconWrap: "border-rose-200/45 bg-rose-400/14 shadow-[0_0_18px_rgba(251,113,133,0.18)]",
      selectedIcon: "text-rose-200",
      selectedTitle: "text-rose-100",
      selectedDot: "bg-rose-300",
      descKey: "expertDesc",
      traitKeys: ["traitUnpredictable", "traitAdvanced", "traitAggressive"],
    }
  ];

  const MIN_CHIPS = 100;
  const selectedBotCount = numberOfBots ?? 0;
  const isExpert = difficulty === "expert";
  const hasCompleteSelection = numberOfBots !== null && difficulty !== null;
  // En mode expert, l’utilisateur ne peut pas choisir les jetons des bots,
  // donc on ignore la validation côté UI.
  const invalidBotChips =
    numberOfBots !== null && !isExpert && botChips.slice(0, numberOfBots).some((c) => c < MIN_CHIPS);
  const canStartGame = hasCompleteSelection && !invalidBotChips;

  const handleStartGame = async () => {
    if (!hasCompleteSelection || numberOfBots === null || difficulty === null) {
      return;
    }
    if (getUserBalance() <= 0) {
      addToast(t("botConfig.balanceRequired") || "Alimentez votre balance pour jouer.", "error");
      return;
    }
    if (invalidBotChips) {
      addToast(t("botConfig.minAmount100") || "Montant minimal 100 chips par bot.", "error");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) {
      addToast(t("auth.loginRequired", "Connectez-vous pour jouer."), "error");
      return;
    }
    const diffApi = (DIFF_LABEL_KEYS[difficulty] ?? "medium") as "easy" | "medium" | "hard" | "expert";
    const botChipsForApi =
      difficulty === "expert" ? DEFAULT_BOT_CHIPS.slice(0, numberOfBots) : botChips.slice(0, numberOfBots);
    const botChipsCustomized =
      difficulty !== "expert" && botChips.slice(0, numberOfBots).some((c, i) => c !== DEFAULT_BOT_CHIPS[i]);
    const humanChipsForApi = botChipsCustomized
      ? Math.floor(botChipsForApi.reduce((sum, c) => sum + c, 0) / Math.max(1, numberOfBots))
      : getUserBalance();
    try {
      const res = await fetch(apiUrl("/api/game/bot/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botCount: numberOfBots,
          difficulty: diffApi,
          botChips: botChipsForApi,
          humanChips: humanChipsForApi,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { gameId?: string; error?: string };
      if (!res.ok) {
        addToast(data.error ?? t("errors.generic", "Erreur serveur"), "error");
        return;
      }
      if (!data.gameId) {
        addToast(t("errors.generic", "Réponse invalide"), "error");
        return;
      }
      try {
        sessionStorage.setItem(
          "qb_last_practice_bot_config",
          JSON.stringify({
            botCount: numberOfBots,
            difficulty: diffApi,
            difficultyUi: difficulty,
            botChips: botChipsForApi,
          }),
        );
      } catch {
        /* ignore quota / private mode */
      }
      navigate(`/game?gameId=${encodeURIComponent(data.gameId)}&mode=bot&difficulty=${difficulty}`);
    } catch (e) {
      console.error(e);
      addToast(t("errors.network", "Erreur réseau"), "error");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto text-white">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
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
      <div className="relative z-10 mx-auto w-full max-w-7xl min-w-0 px-4 pb-8 pt-4 sm:px-8 sm:pb-10 sm:pt-6 lg:px-10">
        {/* Titre */}
        <div className="mb-8 flex items-center gap-4 sm:mb-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-blue-200/25 bg-blue-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_34px_rgba(96,165,250,0.18),0_18px_44px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <Bot className="w-8 h-8 text-blue-200" />
          </div>
          <div>
            <h1 className="mb-1 bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-200 bg-clip-text text-4xl font-bold text-transparent">{t('botConfig.title')}</h1>
            <p className="text-gray-400">
              {t('botConfig.subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            {/* Niveau de difficulté */}
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-6 lg:p-7">
              <div className="mb-5 flex items-center gap-3">
                <Brain className="h-6 w-6 text-blue-200" />
                <h2 className="text-2xl font-bold text-white">{t('botConfig.difficulty')}</h2>
              </div>

              <div className="flex-1 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {difficulties.map((diff) => {
                  const Icon = diff.icon;
                  const isSelected = difficulty === diff.id;
                  const labelKey = DIFF_LABEL_KEYS[diff.id] ?? diff.id;
                  return (
                    <button
                      key={diff.id}
                      onClick={() => setDifficulty(diff.id)}
                      className={`relative rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                        isSelected
                          ? diff.selectedCard
                          : `border-white/10 bg-white/[0.045] backdrop-blur-md ${diff.idleCard}`
                      }`}
                    >
                      {diff.id === "expert" && (
                        <div className="absolute -top-3 left-5 rounded-full border border-cyan-200/70 bg-cyan-950/95 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.28)]">
                          REAL AI
                        </div>
                      )}
                      <div className="flex items-start gap-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                          isSelected ? diff.selectedIconWrap : "border-white/10 bg-white/[0.05]"
                        }`}>
                          <Icon className={`h-5 w-5 ${isSelected ? diff.selectedIcon : "text-gray-400"}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className={`mb-1 text-lg font-bold ${
                            isSelected ? diff.selectedTitle : "text-gray-300"
                          }`}>
                            {t(`botConfig.${labelKey}`)}
                          </h3>
                          <p className={`mb-2 text-sm ${
                            isSelected ? "text-white/80" : "text-gray-500"
                          }`}>
                            {t(`botConfig.${diff.descKey}`)}
                          </p>

                          <div className="space-y-1">
                            {diff.traitKeys.map((traitKey, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className={`h-1.5 w-1.5 rounded-full ${
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

            {/* Nombre de bots */}
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-6 lg:p-7">
              <div className="mb-5 flex items-center gap-3">
                <Users className="h-6 w-6 text-blue-200" />
                <h2 className="text-2xl font-bold text-white">{t('botConfig.numberOfBots')}</h2>
              </div>

              <div className="flex-1 grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setNumberOfBots(num)}
                    className={`relative aspect-square rounded-xl border p-3 transition-all hover:-translate-y-0.5 ${
                      numberOfBots === num
                        ? "border-blue-200/45 bg-blue-950/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_0_34px_rgba(96,165,250,0.22),0_18px_44px_rgba(15,23,42,0.38)] ring-1 ring-blue-300/30"
                        : "border-white/10 bg-white/[0.045] backdrop-blur-md hover:border-blue-300/30 hover:bg-blue-950/20 hover:shadow-[0_0_24px_rgba(96,165,250,0.10)]"
                    }`}
                  >
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className={`mb-1 text-3xl font-bold ${
                        numberOfBots === num ? "text-white" : "text-gray-400"
                      }`}>
                        {num}
                      </div>
                      <div className={`text-xs font-semibold ${
                        numberOfBots === num ? "text-blue-200" : "text-gray-500"
                      }`}>
                        {num} {num > 1 ? "Bots" : "Bot"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* Bouton Commencer */}
          <button
            onClick={handleStartGame}
            disabled={!canStartGame}
            className={`w-full rounded-2xl py-10 text-xl font-bold backdrop-blur-xl transition-all ${
              canStartGame
                ? "border border-emerald-200/60 bg-gradient-to-r from-emerald-950/88 via-emerald-700/86 to-green-500/80 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_54px_rgba(52,211,153,0.34),0_24px_66px_rgba(0,0,0,0.40)] hover:-translate-y-0.5 hover:border-emerald-100/70 hover:from-emerald-900/92 hover:via-emerald-600/90 hover:to-green-400/86 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.20),0_0_76px_rgba(74,222,128,0.46),0_26px_70px_rgba(0,0,0,0.44)]"
                : "cursor-not-allowed border border-white/10 bg-white/[0.035] text-slate-500 shadow-none"
            }`}
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
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <Settings2 className="w-5 h-5 text-blue-200" />
                <h3 className="text-lg font-bold text-white">{t('botConfig.chipsPerBot')}</h3>
                <span className="text-xs text-gray-500 ml-auto">{t('botConfig.defaultChips')}</span>
              </div>
              {isExpert ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">
                  {t("botConfig.chipsPerBotExpertLocked", "En mode expert, les jetons des bots sont prédéfinis.")}
                </div>
              ) : (
                Array.from({ length: selectedBotCount }, (_, i) => {
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
                })
              )}
            </div>
          )}

          {/* Résumé */}
          <div className="mb-16 rounded-xl bg-white/[0.028] p-6 backdrop-blur-xl sm:p-10">
            <h3 className="text-white font-bold text-lg mb-6">{t('botConfig.configSummary')}</h3>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <span className="text-gray-400">{t('botConfig.opponents')}</span>
                <span className="text-white font-bold ml-2">
                  {numberOfBots === null ? "-" : `${numberOfBots} ${numberOfBots > 1 ? "bots" : "bot"}`}
                </span>
              </div>
              <div>
                <span className="text-gray-400">{t('botConfig.difficultyLabel')}</span>
                <span className="text-white font-bold ml-2">
                  {difficulty === null ? "-" : t(`botConfig.${DIFF_LABEL_KEYS[difficulty] ?? difficulty}`)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
