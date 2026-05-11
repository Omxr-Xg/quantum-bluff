import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LobbyMainTab = "poker" | "minigames" | "blackjack";

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
};

const STEP_DEFS: StepDef[] = [
  {
    highlight: null,
    titleKey: "tourWelcomeTitle",
    bodyKey: "tourWelcomeBody",
    mainTab: "poker",
  },
  { highlight: "header", titleKey: "headerTitle", bodyKey: "headerBody", mainTab: "poker" },
  { highlight: "topBar", titleKey: "topBarTitle", bodyKey: "topBarBody", mainTab: "poker" },
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
  { highlight: "friends", titleKey: "friendsTitle", bodyKey: "friendsBody", mainTab: "poker" },
  {
    highlight: null,
    titleKey: "tourDoneTitle",
    bodyKey: "tourDoneBody",
    mainTab: "poker",
  },
];

const PAD = 10;

function clampStep(step: number, total: number): number {
  return Math.min(Math.max(0, step), total - 1);
}

function SpotlightRects({
  rect,
  onBackdropClick,
}: {
  rect: DOMRect;
  onBackdropClick: () => void;
}) {
  const l = Math.max(0, rect.left - PAD);
  const t = Math.max(0, rect.top - PAD);
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;
  const vw = typeof window !== "undefined" ? window.innerWidth : 0;
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;

  const common =
    "fixed z-[240] bg-black/65 backdrop-blur-[2px] pointer-events-auto transition-opacity";

  return (
    <>
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: 0, width: "100%", height: t }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: t + h, width: "100%", height: Math.max(0, vh - t - h) }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: 0, top: t, width: l, height: h }}
        onClick={onBackdropClick}
      />
      <button
        type="button"
        aria-label="overlay"
        className={common}
        style={{ left: l + w, top: t, width: Math.max(0, vw - l - w), height: h }}
        onClick={onBackdropClick}
      />
      <div
        className="fixed z-[241] pointer-events-none rounded-xl border-2 border-purple-400 shadow-[0_0_24px_rgba(168,85,247,0.55)] animate-pulse"
        style={{ left: l, top: t, width: w, height: h }}
      />
    </>
  );
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
};

export function LobbyInteractiveTour({
  open,
  onClose,
  step,
  onStepChange,
  refs,
  setMainTab,
  mainTabKey,
}: Props) {
  const { t } = useTranslation();
  const [rect, setRect] = useState<DOMRect | null>(null);

  const total = STEP_DEFS.length;
  const stepSafe = clampStep(step, total);
  const stepDef = STEP_DEFS[stepSafe]!;

  useLayoutEffect(() => {
    if (!open) return;
    setMainTab(stepDef.mainTab);
  }, [open, stepSafe, stepDef.mainTab, setMainTab]);

  const measure = useCallback(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const current = STEP_DEFS[stepSafe]!;
    if (current.mainTab !== mainTabKey) {
      setRect(null);
      return;
    }
    if (!current.highlight) {
      setRect(null);
      return;
    }
    const el = refs[current.highlight]?.current;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "nearest", behavior: "auto" });
    const key = current.highlight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = refs[key]?.current;
        if (node) setRect(node.getBoundingClientRect());
      });
    });
  }, [open, stepSafe, mainTabKey, refs]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, measure]);

  const next = () => {
    if (stepSafe < total - 1) onStepChange(stepSafe + 1);
    else onClose();
  };

  const prev = () => {
    if (stepSafe > 0) onStepChange(stepSafe - 1);
  };

  const tooltipPos = (): { left: number; top: number } => {
    const margin = 16;
    const tw = Math.min(360, typeof window !== "undefined" ? window.innerWidth - margin * 2 : 360);
    const th = 220;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const vw = typeof window !== "undefined" ? window.innerWidth : 400;

    if (!rect) {
      return {
        left: (vw - tw) / 2,
        top: (vh - th) / 2,
      };
    }

    const l = rect.left - PAD;
    const t = rect.top - PAD;
    const w = rect.width + PAD * 2;
    const h = rect.height + PAD * 2;

    let top = t + h + 16;
    if (top + th > vh - margin) top = t - th - 16;
    if (top < margin) top = margin;

    let left = l + w / 2 - tw / 2;
    left = Math.max(margin, Math.min(left, vw - tw - margin));

    return { left, top };
  };

  const pos = tooltipPos();

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      {!rect && (
        <button
          type="button"
          className="fixed inset-0 z-[240] bg-black/65 backdrop-blur-[2px] pointer-events-auto"
          aria-label={t("lobby.help.close")}
          onClick={onClose}
        />
      )}
      {rect && <SpotlightRects rect={rect} onBackdropClick={onClose} />}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lobby-tour-title"
        className="fixed z-[242] w-[min(calc(100vw-32px),360px)] rounded-2xl border border-purple-500/60 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md"
        style={{ left: pos.left, top: pos.top }}
        onClick={(e) => e.stopPropagation()}
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
              {stepSafe >= total - 1 ? t("lobby.help.finish") : t("lobby.help.next")}
              {stepSafe < total - 1 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
