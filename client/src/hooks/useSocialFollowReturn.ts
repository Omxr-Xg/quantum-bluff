import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "./useUser";
import { setAuthItem } from "../utils/authStorage";
import { useCompleteSocialFollowVisitMutation } from "../services/api";
import {
  clearPendingSocialFollow,
  getPendingSocialFollow,
  SOCIAL_FOLLOW_MIN_AWAY_MS,
} from "../utils/socialFollowChallenge";

export function useSocialFollowReturn() {
  const { t } = useTranslation();
  const { userId } = useUser();
  const { addToast } = useToast();
  const [completeVisit] = useCompleteSocialFollowVisitMutation();
  const completingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    const tryComplete = async () => {
      if (completingRef.current) return;
      const pending = getPendingSocialFollow();
      if (!pending) return;
      if (Date.now() - pending.startedAt < SOCIAL_FOLLOW_MIN_AWAY_MS) return;

      completingRef.current = true;
      clearPendingSocialFollow();

      try {
        const result = await completeVisit(pending.code).unwrap();
        if (typeof result.chips === "number") {
          setAuthItem("quantum_bluff_balance", String(result.chips));
        }
        window.dispatchEvent(new Event("auth-changed"));
        window.dispatchEvent(new Event("user-rewards-updated"));
        addToast(
          t("dailyChallenges.socialFollowReward", { amount: result.rewardTokens }),
          "success",
        );
      } catch {
        // Expired or already claimed — ignore silently on return
      } finally {
        completingRef.current = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void tryComplete();
    };

    const onFocus = () => void tryComplete();

    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, completeVisit, addToast, t]);
}
