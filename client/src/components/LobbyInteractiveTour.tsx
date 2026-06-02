import { useLayoutEffect, useMemo, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { TutorialSpotlight } from "./tutorial/TutorialSpotlight";

export type LobbyMainTab = "poker" | "minigames" | "blackjack" | "belote";

export type LobbyTourRefs = {
  header: RefObject<HTMLElement | null>;
  topBar: RefObject<HTMLElement | null>;
  tabs: RefObject<HTMLElement | null>;
  bot: RefObject<HTMLElement | null>;
  multiplayer: RefObject<HTMLElement | null>;
  waitingRooms: RefObject<HTMLElement | null>;
  gamesInProgress: RefObject<HTMLElement | null>;
  minigamesPanel: RefObject<HTMLElement | null>;
  blackjackPanel: RefObject<HTMLElement | null>;
  dailyChallenges: RefObject<HTMLElement | null>;
  friends: RefObject<HTMLElement | null>;
};

type StepDef = {
  highlight: keyof LobbyTourRefs | null;
  titleKey: string;
  bodyKey: string;
  mainTab: LobbyMainTab;
  spotlightPadding?: number;
};

const STEP_DEFS: StepDef[] = [
  {
    highlight: null,
    titleKey: "tourWelcomeTitle",
    bodyKey: "tourWelcomeBody",
    mainTab: "poker",
  },
  { highlight: "header", titleKey: "headerTitle", bodyKey: "headerBody", mainTab: "poker" },
  { highlight: "topBar", titleKey: "topBarTitle", bodyKey: "topBarBody", mainTab: "poker", spotlightPadding: 0 },
  { highlight: "tabs", titleKey: "tabsTitle", bodyKey: "tabsBody", mainTab: "poker" },
  { highlight: "bot", titleKey: "botTitle", bodyKey: "botBody", mainTab: "poker" },
  {
    highlight: "multiplayer",
    titleKey: "multiplayerTitle",
    bodyKey: "multiplayerBody",
    mainTab: "poker",
  },
  {
    highlight: "waitingRooms",
    titleKey: "waitingTitle",
    bodyKey: "waitingBody",
    mainTab: "poker",
  },
  {
    highlight: "gamesInProgress",
    titleKey: "gamesTitle",
    bodyKey: "gamesBody",
    mainTab: "poker",
  },
  {
    highlight: "minigamesPanel",
    titleKey: "minigamesTabTitle",
    bodyKey: "minigamesTabBody",
    mainTab: "minigames",
    spotlightPadding: 0,
  },
  {
    highlight: "blackjackPanel",
    titleKey: "blackjackTabTitle",
    bodyKey: "blackjackTabBody",
    mainTab: "blackjack",
  },
  {
    highlight: "dailyChallenges",
    titleKey: "dailyTitle",
    bodyKey: "dailyBody",
    mainTab: "poker",
  },
  { highlight: "friends", titleKey: "friendsTitle", bodyKey: "friendsBody", mainTab: "poker", spotlightPadding: 0 },
  {
    highlight: null,
    titleKey: "tourDoneTitle",
    bodyKey: "tourDoneBody",
    mainTab: "poker",
  },
];

function clampStep(step: number, total: number): number {
  return Math.min(Math.max(0, step), total - 1);
}

type Props = {
  open: boolean;
  onClose: () => void;
  step: number;
  onStepChange: (n: number) => void;
  refs: LobbyTourRefs;
  setMainTab: (tab: LobbyMainTab) => void;
  /** Onglet effectif du lobby — attendre qu’il corresponde à l’étape avant de mesurer le spotlight */
  mainTabKey: LobbyMainTab;
  /**
   * Label personnalise du bouton final (par defaut `lobby.help.finish`).
   * Permet d'afficher « Suivant : ta premiere main » quand le tour enchaine
   * sur le tutoriel de partie (`/tutorial/game`).
   */
  finishLabelOverride?: string;
  /**
   * Appele quand le joueur clique sur le bouton final (apres `onClose`).
   * Sert a enchainer sur `/tutorial/game` apres le tour lobby sans modifier
   * le contrat existant de `onClose`.
   */
  onFinish?: () => void;
};

export function LobbyInteractiveTour({
  open,
  onClose,
  step,
  onStepChange,
  refs,
  setMainTab,
  mainTabKey,
  finishLabelOverride,
  onFinish,
}: Props) {
  const { t } = useTranslation();

  const total = STEP_DEFS.length;
  const stepSafe = clampStep(step, total);
  const stepDef = STEP_DEFS[stepSafe]!;

  useLayoutEffect(() => {
    if (!open) return;
    setMainTab(stepDef.mainTab);
  }, [open, stepSafe, stepDef.mainTab, setMainTab]);

  /**
   * Tant que l'onglet effectif n'a pas rattrape le pas en cours, on passe `null`
   * pour eviter de cibler un noeud encore demonte. Le spotlight s'affiche alors
   * en plein-ecran centre, le temps que le tab finisse de switcher.
   */
  const targetRef = useMemo<RefObject<HTMLElement | null> | null>(() => {
    if (stepDef.mainTab !== mainTabKey) return null;
    if (!stepDef.highlight) return null;
    return refs[stepDef.highlight] ?? null;
  }, [stepDef.mainTab, stepDef.highlight, mainTabKey, refs]);

  const next = () => {
    if (stepSafe < total - 1) {
      onStepChange(stepSafe + 1);
      return;
    }
    /* Dernier pas : on enchaine eventuellement (TutorialGame) puis on ferme. */
    onClose();
    if (onFinish) onFinish();
  };

  const prev = () => {
    if (stepSafe > 0) onStepChange(stepSafe - 1);
  };

  const finishLabel = finishLabelOverride ?? t("lobby.help.finish");

  return (
    <TutorialSpotlight
      open={open}
      onClose={onClose}
      targetRef={targetRef}
      measureKey={`${stepSafe}-${mainTabKey}`}
      color="purple"
      tooltipHeight={220}
      spotlightPadding={stepDef.spotlightPadding ?? 10}
      ariaLabelledBy="lobby-tour-title"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="rounded-full bg-purple-600/40 px-2.5 py-0.5 text-xs font-semibold text-purple-200">
          {t("lobby.help.stepOf", { current: stepSafe + 1, total })}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label={t("lobby.help.close")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <h2 id="lobby-tour-title" className="mb-2 text-lg font-bold text-white">
        {t(`lobby.help.${stepDef.titleKey}`)}
      </h2>
      <p className="mb-5 text-sm leading-relaxed text-slate-300">
        {t(`lobby.help.${stepDef.bodyKey}`)}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
        >
          {t("lobby.help.skip")}
        </button>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={stepSafe <= 0}
            onClick={prev}
            className="flex items-center gap-1 rounded-xl border border-slate-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("lobby.help.previous")}
          </button>
          <button
            type="button"
            onClick={next}
            className="flex items-center gap-1 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-500"
          >
            {stepSafe >= total - 1 ? finishLabel : t("lobby.help.next")}
            {stepSafe < total - 1 && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </TutorialSpotlight>
  );
}
