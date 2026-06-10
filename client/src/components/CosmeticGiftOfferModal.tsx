import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles, X } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import { CosmeticAvatar, CosmeticBannerCard, CosmeticTitle } from "./PlayerCosmetics";
import type { PublicPlayerCosmetics } from "../utils/publicCosmetics";
import { store } from "../store";
import { api } from "../services/api";

export type CosmeticGiftOfferDetail = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  cosmeticId: string;
  cosmeticName: string;
  cosmeticType: string;
  rarity: string | null;
  purchasable: boolean;
  preview: Record<string, unknown>;
};

type CosmeticGiftOfferModalProps = {
  offerId: string;
  onClose: () => void;
  onResolved?: () => void;
};

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function previewToCosmetics(detail: CosmeticGiftOfferDetail): PublicPlayerCosmetics {
  const p = detail.preview;
  const type = String(p.type ?? detail.cosmeticType);
  if (type === "BANNER") {
    const bg = p.background as string | null;
    return {
      banner: bg ? { id: detail.cosmeticId, gradient: bg, overlayOpacity: p.overlayOpacity as number | undefined } : null,
      frame: null,
      title: null,
    };
  }
  if (type === "AVATAR_FRAME") {
    return {
      banner: null,
      frame: {
        id: detail.cosmeticId,
        border: String(p.border ?? "#c9a84c"),
        glow: p.glow as string | undefined,
        borderWidth: p.borderWidth as number | undefined,
        imageUrl: p.imageUrl as string | undefined,
      },
      title: null,
    };
  }
  return {
    banner: null,
    frame: null,
    title: {
      id: detail.cosmeticId,
      nameKey: detail.cosmeticName,
      color: String(p.color ?? "#fde047"),
      textShadow: p.textShadow as string | undefined,
      fontWeight: p.fontWeight as number | undefined,
      letterSpacing: p.letterSpacing as string | undefined,
    },
  };
}

export function CosmeticGiftOfferModal({ offerId, onClose, onResolved }: CosmeticGiftOfferModalProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<CosmeticGiftOfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/notifications/cosmetic-gifts/${encodeURIComponent(offerId)}`), {
        headers: authHeaders(),
      });
      const data = (await res.json()) as CosmeticGiftOfferDetail & { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("common.error"));
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [offerId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async () => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/notifications/cosmetic-gifts/${encodeURIComponent(offerId)}/accept`),
        { method: "POST", headers: authHeaders(), body: JSON.stringify({ apply: true }) },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("common.error"));
      store.dispatch(api.util.invalidateTags(["Shop", "Notification", "User"]));
      onResolved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setActing(false);
    }
  };

  const decline = async () => {
    setActing(true);
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/notifications/cosmetic-gifts/${encodeURIComponent(offerId)}/decline`),
        { method: "POST", headers: authHeaders() },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("common.error"));
      store.dispatch(api.util.invalidateTags(["Notification"]));
      onResolved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setActing(false);
    }
  };

  const cosmetics = detail ? previewToCosmetics(detail) : null;
  const isPending = detail?.status === "PENDING";

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">{t("cosmeticGift.modalTitle")}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          ) : detail ? (
            <>
              <p className="mb-1 text-center text-sm text-slate-400">{t("cosmeticGift.modalSubtitle")}</p>
              <p className="mb-4 text-center text-xl font-bold text-amber-200">{detail.cosmeticName}</p>

              <div className="mb-5 flex justify-center">
                {detail.cosmeticType === "BANNER" && cosmetics && (
                  <CosmeticBannerCard cosmetics={cosmetics} bannerHeightClass="h-28 w-full" className="w-full">
                    <div className="flex h-full items-center justify-center">
                      <span className="text-sm text-white/80">{t("cosmeticGift.previewBanner")}</span>
                    </div>
                  </CosmeticBannerCard>
                )}
                {detail.cosmeticType === "AVATAR_FRAME" && cosmetics && (
                  <CosmeticAvatar cosmetics={cosmetics} sizeClass="h-24 w-24">
                    <div className="flex h-full w-full items-center justify-center text-2xl">🎴</div>
                  </CosmeticAvatar>
                )}
                {detail.cosmeticType === "TITLE" && cosmetics && (
                  <CosmeticTitle cosmetics={cosmetics} className="text-lg font-bold uppercase tracking-widest" />
                )}
              </div>

              {!isPending && (
                <p className="mb-4 text-center text-sm text-slate-500">
                  {detail.status === "ACCEPTED"
                    ? t("cosmeticGift.alreadyAccepted")
                    : t("cosmeticGift.alreadyDeclined")}
                </p>
              )}

              {error && (
                <p className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              )}

              {isPending && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void accept()}
                    className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3 text-sm font-semibold text-white hover:from-amber-500 hover:to-orange-500 disabled:opacity-50"
                  >
                    {acting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("cosmeticGift.acceptApply")}
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void decline()}
                    className="flex-1 rounded-xl border border-red-500/40 bg-red-950/50 py-3 text-sm font-semibold text-red-200 hover:bg-red-900/50 disabled:opacity-50"
                  >
                    {t("cosmeticGift.decline")}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="py-8 text-center text-red-300">{error ?? t("common.error")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
