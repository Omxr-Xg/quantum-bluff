import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Lock, Loader2 } from "lucide-react";
import {
  AVATAR_PRESET_CATALOG,
  AVATAR_PRESETS,
  avatarPresetPriceChips,
  isFreeAvatarPresetId,
} from "@/utils/avatars";
import { ChipIcon } from "./ChipIcon";
import { useGetShopAvatarsQuery, usePurchaseAvatarPresetMutation } from "../services/api";
import { useToast } from "../contexts/ToastContext";

const INITIAL_VISIBLE = 6;

interface AvatarGalleryProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

export function AvatarGallery({ selectedAvatar, onSelect }: AvatarGalleryProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { data, isLoading, refetch } = useGetShopAvatarsQuery();
  const [purchaseAvatar, { isLoading: purchasing }] = usePurchaseAvatarPresetMutation();

  const selectedPresetIndex = AVATAR_PRESETS.indexOf(selectedAvatar);
  const [expanded, setExpanded] = useState(() => selectedPresetIndex >= INITIAL_VISIBLE);
  const [pendingPurchaseId, setPendingPurchaseId] = useState<string | null>(null);

  const ownershipById = useMemo(() => {
    const map = new Map<string, { owned: boolean; free: boolean; priceChips: number }>();
    for (const item of data?.items ?? []) {
      map.set(item.id, {
        owned: item.owned,
        free: item.free,
        priceChips: item.priceChips,
      });
    }
    return map;
  }, [data?.items]);

  useEffect(() => {
    if (selectedPresetIndex >= INITIAL_VISIBLE) {
      setExpanded(true);
    }
  }, [selectedPresetIndex, selectedAvatar]);

  const total = AVATAR_PRESET_CATALOG.length;
  const hasMore = total > INITIAL_VISIBLE;
  const visible = expanded ? AVATAR_PRESET_CATALOG : AVATAR_PRESET_CATALOG.slice(0, INITIAL_VISIBLE);
  const canCollapse = selectedPresetIndex === -1 || selectedPresetIndex < INITIAL_VISIBLE;

  const handleAvatarClick = async (preset: { id: string; url: string }) => {
    const access = ownershipById.get(preset.id);
    const unlocked = access?.owned ?? isFreeAvatarPresetId(preset.id);

    if (unlocked) {
      onSelect(preset.url);
      return;
    }

    setPendingPurchaseId(preset.id);
    try {
      await purchaseAvatar(preset.id).unwrap();
      await refetch();
      onSelect(preset.url);
      addToast(t("editProfile.avatarUnlocked"), "success");
    } catch (err: unknown) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ??
        t("editProfile.avatarPurchaseError", { defaultValue: "Achat impossible pour le moment." });
      addToast(message, "error");
    } finally {
      setPendingPurchaseId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6"
          role="list"
          aria-label={t("editProfile.avatarGalleryLabel")}
        >
          {visible.map((preset, index) => {
            const isSelected = selectedAvatar === preset.url;
            const access = ownershipById.get(preset.id);
            const unlocked = access?.owned ?? isFreeAvatarPresetId(preset.id);
            const price = access?.priceChips ?? avatarPresetPriceChips(preset.id);
            const isBuying = purchasing && pendingPurchaseId === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                role="listitem"
                disabled={isBuying}
                aria-label={t("editProfile.avatarOption", { index: index + 1, total })}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => void handleAvatarClick(preset)}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition-all duration-200 ${
                  isSelected
                    ? "scale-105 border-blue-200/55 bg-blue-400/12 shadow-[0_0_24px_rgba(59,130,246,0.18)] ring-1 ring-amber-200/20"
                    : unlocked
                      ? "border-white/10 bg-slate-950/35 hover:scale-105 hover:border-blue-200/28 hover:bg-white/[0.06]"
                      : "border-amber-300/20 bg-slate-950/50 hover:border-amber-200/35"
                }`}
              >
                <div className="relative">
                  <img
                    src={preset.url}
                    alt=""
                    className={`h-16 w-16 rounded-full object-cover ${unlocked ? "" : "opacity-55"}`}
                  />
                  {!unlocked ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/45">
                      {isBuying ? (
                        <Loader2 className="h-5 w-5 animate-spin text-amber-200" />
                      ) : (
                        <Lock className="h-5 w-5 text-amber-200" />
                      )}
                    </span>
                  ) : null}
                </div>
                {!unlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-200">
                    <ChipIcon size="sm" />
                    {price.toLocaleString()}
                  </span>
                ) : access?.free ? (
                  <span className="text-[10px] font-semibold text-emerald-300">
                    {t("editProfile.avatarFree")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-950/60 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-blue-200/30 hover:bg-blue-900/70 hover:text-white"
              aria-expanded={false}
            >
              <ChevronDown className="h-4 w-4 shrink-0 text-blue-200" aria-hidden />
              {t("editProfile.showMoreAvatars", { count: total - INITIAL_VISIBLE })}
            </button>
          ) : (
            canCollapse && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                aria-expanded
              >
                <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                {t("editProfile.showLessAvatars")}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
