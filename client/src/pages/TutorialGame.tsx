import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, Check, ChevronLeft, ChevronRight, Eye, MessageCircle, TrendingUp, X } from "lucide-react";
import { PokerCard, PokerCardSlot } from "../components/PokerCard";
import { PokerTable } from "../components/PokerTable";
import { ChipIcon } from "../components/ChipIcon";
import { NeonButton } from "../components/NeonButton";
import { HandCombinationsHelpButton } from "../components/HandCombinationsHelpButton";
import { TutorialSpotlight } from "../components/tutorial/TutorialSpotlight";
import {
  HAND_RANKING_LADDER,
  TUTORIAL_BOT_HAND,
  TUTORIAL_HERO_FINAL_RANK,
  TUTORIAL_HERO_HAND,
  TUTORIAL_STEPS,
  type HandRanking,
  type TutorialHighlight,
  type TutorialStep,
} from "../features/tutorial/tutorialHandScript";
import { apiFetch, apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";

/**
 * Page tutoriel : main de Texas Hold'em entierement scriptee jouee contre
 * un faux bot. Aucun appel jeu / aucun mouvement de solde reel. Vise un
 * onboarding « A a Z » accessible depuis le bouton « ? » du Lobby.
 *
 * Cle de l'implementation : on consomme le vrai composant <PokerTable> pour
 * que l'apprenant decouvre l'interface exacte qu'il utilisera en partie.
 * Les overlays « anchors » invisibles (heroAnchor/botAnchor/etc.) servent
 * uniquement de cibles au spotlight pedagogique.
 */
export function TutorialGame() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const step: TutorialStep = TUTORIAL_STEPS[stepIndex] ?? TUTORIAL_STEPS[0]!;

  /* -- Refs : utilises par le spotlight pour mesurer la zone a surligner. -- */
  const tableSectionRef = useRef<HTMLElement | null>(null);
  const potRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<HTMLElement | null>(null);
  const heroAnchorRef = useRef<HTMLElement | null>(null);
  const botAnchorRef = useRef<HTMLElement | null>(null);
  const heroCardsAnchorRef = useRef<HTMLElement | null>(null);
  const botCardsAnchorRef = useRef<HTMLElement | null>(null);
  const dealerAnchorRef = useRef<HTMLElement | null>(null);
  const blindsAnchorRef = useRef<HTMLElement | null>(null);
  const actionsRef = useRef<HTMLElement | null>(null);
  const rankingsRef = useRef<HTMLElement | null>(null);

  const refMap: Record<Exclude<TutorialHighlight, null>, React.RefObject<HTMLElement | null>> =
    useMemo(
      () => ({
        table: tableSectionRef,
        pot: potRef,
        board: boardRef,
        heroCards: heroCardsAnchorRef,
        botCards: botCardsAnchorRef,
        actions: actionsRef,
        blinds: blindsAnchorRef,
        dealer: dealerAnchorRef,
        heroSeat: heroAnchorRef,
        botSeat: botAnchorRef,
        rankings: rankingsRef,
      }),
      [],
    );

  const targetRef = step.highlight ? refMap[step.highlight] : null;
  const spotlightPadding =
    step.highlight === "dealer" || step.highlight === "blinds" || step.highlight === "actions" ? 4 : 8;

  const goNext = useCallback(() => {
    setStepIndex((s) => Math.min(TUTORIAL_STEPS.length - 1, s + 1));
  }, []);

  const goPrev = useCallback(() => {
    setStepIndex((s) => Math.max(0, s - 1));
  }, []);

  const markTutorialCompleted = useCallback(async () => {
    try {
      const token = getAuthItem("token");
      if (!token) return;
      await apiFetch(apiUrl("/api/auth/lobby-tutorial/complete"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* non bloquant : si le marquage echoue, le lobby ne re-ouvrira que la prochaine fois */
    }
  }, []);

  const handleFinish = useCallback(async () => {
    await markTutorialCompleted();
    navigate("/lobby", { replace: true });
  }, [navigate, markTutorialCompleted]);

  const handleSkip = useCallback(async () => {
    await markTutorialCompleted();
    navigate("/lobby", { replace: true });
  }, [navigate, markTutorialCompleted]);

  const onActionClick = useCallback(
    (action: TutorialStep["expectedAction"], _amount?: number) => {
      if (action !== step.expectedAction) return;
      if (action === "finish") {
        void handleFinish();
        return;
      }
      goNext();
    },
    [step.expectedAction, goNext, handleFinish],
  );

  /* -- Construction des joueurs pour <PokerTable> -- */
  const isShowdownLike = step.phase === "showdown" || step.phase === "outro";
  const isHeroToAct =
    step.expectedAction !== "next" && step.expectedAction !== "finish";

  const heroCards = step.showHeroCards
    ? [
        { suit: TUTORIAL_HERO_HAND[0].suit, value: TUTORIAL_HERO_HAND[0].value },
        { suit: TUTORIAL_HERO_HAND[1].suit, value: TUTORIAL_HERO_HAND[1].value },
      ]
    : undefined;

  const botCardsRendered = step.showHeroCards
    ? [
        { suit: TUTORIAL_BOT_HAND[0].suit, value: TUTORIAL_BOT_HAND[0].value },
        { suit: TUTORIAL_BOT_HAND[1].suit, value: TUTORIAL_BOT_HAND[1].value },
      ]
    : undefined;

  /* En heads-up : le bouton poste la SB. On garde la convention de tutorialHandScript
   * (hero = BTN+SB, bot = BB). */
  const players = useMemo(
    () => [
      {
        id: "hero",
        name: t("tutorial.game.you"),
        chips: step.heroChips,
        bet: step.heroBet,
        position: 0,
        isActive: isHeroToAct,
        isDealer: true,
        role: "SB" as const,
        cards: heroCards,
        avatar: undefined,
      },
      {
        id: "bot",
        name: t("tutorial.game.opponent"),
        chips: step.botChips,
        bet: step.botBet,
        position: 1,
        isActive: false,
        isDealer: false,
        role: "BB" as const,
        cards: botCardsRendered,
        avatar: undefined,
      },
    ],
    [
      t,
      step.heroChips,
      step.heroBet,
      step.botChips,
      step.botBet,
      isHeroToAct,
      heroCards,
      botCardsRendered,
    ],
  );

  /* -- Echelle des classements (visible mais surlignee a l'etape rankings) -- */
  const rankingItem = (rank: HandRanking) => {
    const isHero = rank === TUTORIAL_HERO_FINAL_RANK;
    return (
      <li
        key={rank}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
          isHero
            ? "border border-amber-400 bg-amber-500/15 font-bold text-amber-100"
            : "text-slate-300"
        }`}
      >
        <span>{t(`tutorial.game.rankings.${rank}`)}</span>
        {isHero && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] uppercase text-slate-900">
            {t("tutorial.game.rankings.yours")}
          </span>
        )}
      </li>
    );
  };

  const showRankingsBody = step.highlight === "rankings";

  return (
    <div className="relative min-h-full w-full overflow-x-hidden app-shell-bg p-4 sm:p-8">
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {t("tutorial.game.title")}
            </h1>
            <p className="text-sm text-slate-400">{t("tutorial.game.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleSkip()}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            <X className="mr-1 inline-block h-4 w-4" />
            {t("tutorial.game.skip")}
          </button>
        </header>

        {/* Pot (au-dessus de la table, comme en jeu reel). */}
        <div className="flex justify-center">
          <div
            ref={(el) => {
              potRef.current = el;
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/50 bg-slate-900/80 px-5 py-2.5 shadow-inner backdrop-blur-md"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-300/80">
              {t("tutorial.game.pot")}
            </span>
            <ChipIcon size="md" />
            <span className="text-lg font-bold tabular-nums text-amber-100">
              {step.pot.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Table : on rend EXACTEMENT le composant utilise en partie reelle. */}
        <section
          ref={(el) => {
            tableSectionRef.current = el;
          }}
          className="relative mx-auto w-full"
        >
          <PokerTable
            players={players}
            phase={isShowdownLike ? "showdown" : "playing"}
            heroSeatId="hero"
            heroTimerActive={false}
            hideHeroChipStack={false}
            layoutSeatCount={2}
          >
            {/* Community cards — passees comme children pour respecter le slot natif. */}
            <div
              ref={(el) => {
                boardRef.current = el;
              }}
              className="flex justify-center gap-1.5"
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const c = step.board[i];
                if (!c) return <PokerCardSlot key={i} size="md" />;
                return (
                  <PokerCard
                    key={`${c.suit}-${c.value}-${i}`}
                    suit={c.suit}
                    value={c.value}
                    size="md"
                    animated
                    cardEnter="soft"
                    animationDelay={i * 0.08}
                  />
                );
              })}
            </div>
          </PokerTable>

          {/* Anchors invisibles utilises uniquement par le spotlight pour mesurer
           * une zone du plateau. Pas de visuel, pas d'evenements pointeur.
           * Pourcentages cales sur le layout heads-up de PokerTable (pos 0 bas, pos 1 haut). */}
          <span
            ref={(el) => {
              heroAnchorRef.current = el;
            }}
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "79%",
              transform: "translate(-50%, -50%)",
              width: "128px",
              height: "128px",
            }}
            aria-hidden
          />
          <span
            ref={(el) => {
              botAnchorRef.current = el;
            }}
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "16%",
              transform: "translate(-50%, -50%)",
              width: "140px",
              height: "140px",
            }}
            aria-hidden
          />
          <span
            ref={(el) => {
              heroCardsAnchorRef.current = el;
            }}
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "89%",
              transform: "translate(-50%, -50%)",
              width: "min(34%, 185px)",
              height: "96px",
            }}
            aria-hidden
          />
          <span
            ref={(el) => {
              botCardsAnchorRef.current = el;
            }}
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "29%",
              transform: "translate(-50%, -50%)",
              width: "min(30%, 155px)",
              height: "70px",
            }}
            aria-hidden
          />
          <span
            ref={(el) => {
              dealerAnchorRef.current = el;
            }}
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "62%",
              transform: "translate(-50%, -50%)",
              width: "86px",
              height: "42px",
            }}
            aria-hidden
          />
          <span
            ref={(el) => {
              blindsAnchorRef.current = el;
            }}
            className="pointer-events-none absolute"
            style={{
              left: "50%",
              top: "45%",
              transform: "translate(-50%, -50%)",
              width: "min(48%, 270px)",
              height: "160px",
            }}
            aria-hidden
          />
        </section>

        {/* Panneau d'action — meme placement que dans Game.tsx (sous la table). */}
        <ActionPanel
          actionsRef={actionsRef}
          step={step}
          onAction={onActionClick}
          onPrev={stepIndex > 0 ? goPrev : null}
          stepIndex={stepIndex}
          totalSteps={TUTORIAL_STEPS.length}
        />

        {step.highlight === "rankings" && (
          <section
            ref={(el) => {
              rankingsRef.current = el;
            }}
            className="fixed right-4 top-1/2 z-30 max-h-[min(80vh,34rem)] w-[min(calc(100vw-2rem),24rem)] -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/92 p-5 shadow-2xl backdrop-blur-xl max-lg:left-1/2 max-lg:right-auto max-lg:top-auto max-lg:bottom-4 max-lg:-translate-x-1/2 max-lg:translate-y-0"
          >
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-200">
              {t("tutorial.game.rankings.title")}
            </h2>
            <ul className="grid grid-cols-1 gap-1">
              {HAND_RANKING_LADDER.map(rankingItem)}
            </ul>
          </section>
        )}
      </div>

      {/* Spotlight pedagogique */}
      <TutorialSpotlight
        open={true}
        onClose={() => void handleSkip()}
        targetRef={targetRef}
        measureKey={stepIndex}
        color="cyan"
        tooltipHeight={showRankingsBody ? 480 : 360}
        spotlightPadding={spotlightPadding}
        scrollBlock="center"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="rounded-full bg-cyan-600/35 px-2.5 py-0.5 text-xs font-semibold text-cyan-200">
            {t("tutorial.game.stepOf", {
              current: stepIndex + 1,
              total: TUTORIAL_STEPS.length,
            })}
          </span>
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
            {t(`tutorial.game.${step.phaseLabelKey}`)}
          </span>
        </div>
        <h2 className="mb-2 text-lg font-bold text-white">
          {t(`tutorial.game.steps.${step.key}.title`)}
        </h2>
        <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-slate-300">
          {t(`tutorial.game.steps.${step.key}.body`)}
        </p>
        {step.expectedAction !== "next" && step.expectedAction !== "finish" && (
          <p className="mb-3 rounded-lg border border-cyan-700/40 bg-cyan-950/50 px-3 py-2 text-xs text-cyan-200">
            {t(`tutorial.game.cta.${step.expectedAction}`, {
              amount: step.raiseTo ?? "",
            })}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void handleSkip()}
            className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            {t("tutorial.game.skip")}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={stepIndex <= 0}
              onClick={goPrev}
              className="flex items-center gap-1 rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("tutorial.game.prev")}
            </button>
            {step.expectedAction === "next" && (
              <button
                type="button"
                onClick={goNext}
                className="flex items-center gap-1 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500"
              >
                {t("tutorial.game.next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            {step.expectedAction === "finish" && (
              <button
                type="button"
                onClick={() => void handleFinish()}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                {t("tutorial.game.finish")}
              </button>
            )}
          </div>
        </div>
      </TutorialSpotlight>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type ActionPanelProps = {
  actionsRef: React.RefObject<HTMLElement | null>;
  step: TutorialStep;
  onAction: (action: TutorialStep["expectedAction"], amount?: number) => void;
  onPrev: (() => void) | null;
  stepIndex: number;
  totalSteps: number;
};

function ActionPanel({
  actionsRef,
  step,
  onAction,
  onPrev,
  stepIndex,
  totalSteps,
}: ActionPanelProps) {
  const { t } = useTranslation();

  /** Tous les boutons sont desactives sauf celui correspondant a l'action attendue. */
  const isEnabled = (action: TutorialStep["expectedAction"]) =>
    action === step.expectedAction;

  const Btn = ({
    action,
    label,
    variant,
    amount,
    icon,
  }: {
    action: TutorialStep["expectedAction"];
    label: string;
    variant: "red" | "blue" | "green" | "gold" | "amber";
    amount?: number;
    icon?: React.ReactNode;
  }) => {
    const enabled = isEnabled(action);
    return (
      <NeonButton
        onClick={() => onAction(action, amount)}
        disabled={!enabled}
        variant={variant}
        icon={icon}
        className="w-full justify-center px-3 py-2.5 text-[0.8rem] md:px-4 md:py-3 md:text-[0.85rem] xl:w-auto xl:min-w-[176px] xl:px-[2.2rem] xl:py-[1.1rem] xl:text-[1.1rem]"
      >
        {label}
        {amount != null && <span className="ml-1 tabular-nums">{amount}</span>}
      </NeonButton>
    );
  };

  return (
    <section
      ref={(el) => {
        actionsRef.current = el;
      }}
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1.2rem)] left-0 right-0 z-40 w-full transition-all duration-300 md:bottom-6 xl:bottom-12"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[min(1200px,calc(100vw-1rem))] lg:max-w-[min(1200px,calc(100vw-2rem))]">
        <div className="flex flex-wrap items-end justify-center gap-2 xl:grid xl:grid-cols-[minmax(16rem,1fr)_auto_minmax(16rem,1fr)] xl:gap-5">
          <div className="w-full grid grid-cols-3 gap-1.5 xl:order-2 xl:flex xl:w-auto xl:justify-self-center xl:gap-3">
            <Btn action="fold" label={t("tutorial.game.actions.fold")} variant="red" icon={<X className="hidden h-4 w-4 lg:block lg:h-6 lg:w-6" />} />
            {step.callAmount === 0 ? (
              <Btn action="check" label={t("tutorial.game.actions.check")} variant="blue" icon={<Check className="hidden h-4 w-4 lg:block lg:h-6 lg:w-6" />} />
            ) : (
              <Btn
                action="call"
                label={t("tutorial.game.actions.call")}
                variant="blue"
                amount={step.callAmount}
                icon={<Check className="hidden h-4 w-4 lg:block lg:h-6 lg:w-6" />}
              />
            )}
            <Btn
              action={step.expectedAction === "bet" ? "bet" : "raise"}
              label={step.expectedAction === "bet" ? t("tutorial.game.actions.bet") : t("tutorial.game.actions.raise")}
              variant="green"
              amount={step.raiseTo}
              icon={<TrendingUp className="hidden h-4 w-4 lg:block lg:h-6 lg:w-6" />}
            />
          </div>

          <div className="flex shrink-0 flex-wrap items-end gap-2 drop-shadow-2xl xl:order-1 xl:justify-self-end">
            <NeonButton disabled variant="blue" icon={<MessageCircle className="h-4 w-4 shrink-0" />} className="px-3 py-2.5 text-xs md:px-5 md:py-3.5">
              Chat
            </NeonButton>
            <HandCombinationsHelpButton />
          </div>

          <div className="flex shrink-0 flex-wrap items-end gap-1.5 xl:order-3 xl:justify-self-start">
            <NeonButton disabled variant="gold" icon={<Eye className="h-4 w-4" />} className="px-3 py-2.5 text-xs md:px-5 md:py-3.5">
              {t("game.bets")}
            </NeonButton>
            <NeonButton disabled variant="amber" icon={<Activity className="h-4 w-4" />} className="px-3 py-2.5 text-xs md:px-5 md:py-3.5">
              {t("game.probabilitiesShort")}
            </NeonButton>
          </div>
        </div>

        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("tutorial.game.prev")}
          </button>
        )}
        <span className="sr-only">
          {t("tutorial.game.stepOf", { current: stepIndex + 1, total: totalSteps })}
        </span>
      </div>
    </section>
  );
}
