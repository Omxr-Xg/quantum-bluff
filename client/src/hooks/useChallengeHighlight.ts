import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { ChallengeHighlightId } from "../utils/challengeHighlight";

export function useChallengeHighlight() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState<ChallengeHighlightId | null>(
    highlightParam as ChallengeHighlightId | null,
  );

  useEffect(() => {
    if (highlightParam) {
      setActiveHighlight(highlightParam as ChallengeHighlightId);
    }
  }, [highlightParam]);

  const isHighlighted = useCallback(
    (id: ChallengeHighlightId) => activeHighlight === id,
    [activeHighlight],
  );

  const clearHighlight = useCallback(() => {
    setActiveHighlight(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("highlight");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  useEffect(() => {
    if (!activeHighlight) return;

    let attempts = 0;
    let rafId = 0;
    const tryScroll = () => {
      const el = document.querySelector(`[data-challenge-highlight="${activeHighlight}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      if (attempts < 12) {
        attempts += 1;
        rafId = window.requestAnimationFrame(tryScroll);
      }
    };
    rafId = window.requestAnimationFrame(tryScroll);

    const timeout = window.setTimeout(() => {
      clearHighlight();
    }, 12_000);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeout);
    };
  }, [activeHighlight, clearHighlight]);

  const hintVisible = useMemo(() => Boolean(activeHighlight), [activeHighlight]);

  return { activeHighlight, isHighlighted, hintVisible, clearHighlight };
}
