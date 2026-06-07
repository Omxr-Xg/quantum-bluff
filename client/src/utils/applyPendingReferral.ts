import { apiUrl } from "./apiBase";
import { getAuthItem } from "./authStorage";
import {
  clearPendingReferralCode,
  getPendingReferralCode,
} from "./referralStorage";
import { updateUserBalance, fetchBalanceFromServer } from "./userProfile";
import { store } from "../store";
import { api } from "../services/api";
import { trackEvent } from "./analytics";

export type ApplyPendingReferralResult = {
  applied: boolean;
  chips?: number;
  referrerUsername?: string;
};

/** Applique le code parrainage en attente (sessionStorage) juste après auth. */
export async function applyPendingReferralAfterAuth(
  token?: string,
): Promise<ApplyPendingReferralResult> {
  const code = getPendingReferralCode();
  if (!code) return { applied: false };

  const authToken = token ?? getAuthItem("token");
  if (!authToken) return { applied: false };

  try {
    const res = await fetch(apiUrl("/api/referral/apply"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      return { applied: false };
    }

    const data = (await res.json()) as {
      chips?: number;
      referrerUsername?: string;
    };

    if (typeof data.chips === "number" && Number.isFinite(data.chips)) {
      updateUserBalance(data.chips);
    } else {
      await fetchBalanceFromServer({ authoritative: true });
    }

    clearPendingReferralCode();
    store.dispatch(api.util.invalidateTags(["Friend", "Referral", "User"]));
    trackEvent("referral_applied");

    return {
      applied: true,
      chips: data.chips,
      referrerUsername: data.referrerUsername,
    };
  } catch {
    return { applied: false };
  }
}
