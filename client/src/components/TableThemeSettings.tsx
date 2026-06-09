import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Loader2, Upload } from "lucide-react";
import {
  TABLE_FELT_BACKGROUND_IDS,
  TABLE_FELT_BACKGROUND_URLS,
  TABLE_FELT_GRADIENTS,
  type TableFeltBackgroundId,
  type TableThemeId,
  useTableTheme,
} from "../contexts/TableThemeContext";
import { ChipIcon } from "./ChipIcon";
import { useToast } from "../contexts/ToastContext";
import {
  useGetTableThemeShopQuery,
  usePurchaseTableUnlockMutation,
  useUpdateTablePreferencesMutation,
  useUploadTableBackgroundMutation,
} from "../services/api";
import { fileToAvatarDataUrl } from "../utils/avatarUpload";
import {
  CUSTOM_FELT_BACKGROUND_UNLOCK,
  CUSTOM_FELT_COLOR_UNLOCK,
  feltBackgroundPriceChips,
  feltGradientFromCustomColor,
  feltThemePriceChips,
  tableUnlockPriceChips,
} from "../utils/tableThemeShop";

const DEFAULT_CUSTOM_FELT_COLOR = "#0b7f52";

function normalizeHexColor(hex: string): string {
  return hex.trim().toLowerCase();
}
import { apiUrl } from "../utils/apiBase";

const THEME_IDS: TableThemeId[] = ["default", "vegasRed", "vegasPurple", "darkBlue"];

interface TableThemeSettingsProps {
  onSelectSfx?: () => void;
}

export function TableThemeSettings({ onSelectSfx }: TableThemeSettingsProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const {
    tableTheme,
    feltBackgroundId,
    customFeltColor,
    setTableTheme,
    setFeltBackgroundId,
    setCustomFeltColor,
  } = useTableTheme();
  const { data, isLoading, refetch } = useGetTableThemeShopQuery();
  const [purchaseUnlock, { isLoading: purchasing }] = usePurchaseTableUnlockMutation();
  const [updatePrefs] = useUpdateTablePreferencesMutation();
  const [uploadBackground, { isLoading: uploadingBg }] = useUploadTableBackgroundMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [draftCustomColor, setDraftCustomColor] = useState(DEFAULT_CUSTOM_FELT_COLOR);
  const [applyingCustomColor, setApplyingCustomColor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fromContext = customFeltColor;
    const fromPrefs = data?.preferences?.feltCustomColor;
    const next = fromContext || fromPrefs;
    if (next) setDraftCustomColor(next);
  }, [customFeltColor, data?.preferences?.feltCustomColor]);

  const owned = useMemo(() => {
    const ids = new Set(data?.preferences?.ownedUnlockIds ?? []);
    for (const item of [
      ...(data?.feltThemes ?? []),
      ...(data?.feltBackgrounds ?? []),
      ...(data?.extras ?? []),
    ]) {
      if (item.owned) ids.add(item.id);
    }
    return ids;
  }, [data]);

  const themeUnlocked = (id: TableThemeId) => id === "default" || owned.has(id);
  const bgUnlocked = (id: TableFeltBackgroundId) => id === "ba1" || owned.has(id);
  const customColorUnlocked = owned.has(CUSTOM_FELT_COLOR_UNLOCK);
  const customBgUnlocked = owned.has(CUSTOM_FELT_BACKGROUND_UNLOCK);
  const savedCustomColor = data?.preferences?.feltCustomColor ?? null;
  const isCustomColorApplied = Boolean(
    customColorUnlocked &&
      data?.preferences?.feltThemeId === "custom" &&
      tableTheme === "custom" &&
      savedCustomColor &&
      normalizeHexColor(savedCustomColor) === normalizeHexColor(draftCustomColor),
  );
  const draftFeltGradient = feltGradientFromCustomColor(draftCustomColor);

  const buyUnlock = async (unlockId: string, onSuccess?: () => void) => {
    setPendingId(unlockId);
    try {
      await purchaseUnlock(unlockId).unwrap();
      await refetch();
      onSuccess?.();
      addToast(t("settings.tableThemeUnlocked"), "success");
    } catch (err: unknown) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ??
        t("settings.tableThemePurchaseError");
      addToast(message, "error");
    } finally {
      setPendingId(null);
    }
  };

  const selectTheme = async (id: TableThemeId, skipUnlockCheck = false) => {
    if (!skipUnlockCheck && !themeUnlocked(id)) {
      await buyUnlock(id, () => void selectTheme(id, true));
      return;
    }
    try {
      await updatePrefs({ feltThemeId: id }).unwrap();
      setTableTheme(id);
      onSelectSfx?.();
    } catch {
      addToast(t("settings.tableThemePurchaseError"), "error");
    }
  };

  const selectBackground = async (id: TableFeltBackgroundId, skipUnlockCheck = false) => {
    if (!skipUnlockCheck && !bgUnlocked(id)) {
      await buyUnlock(id, () => void selectBackground(id, true));
      return;
    }
    try {
      await updatePrefs({ feltBackgroundId: id }).unwrap();
      setFeltBackgroundId(id);
      onSelectSfx?.();
    } catch {
      addToast(t("settings.tableThemePurchaseError"), "error");
    }
  };

  const applyCustomColor = async (skipUnlockCheck = false) => {
    if (!skipUnlockCheck && !customColorUnlocked) {
      await buyUnlock(CUSTOM_FELT_COLOR_UNLOCK, () => void applyCustomColor(true));
      return;
    }
    if (isCustomColorApplied) return;
    const color = draftCustomColor;
    setApplyingCustomColor(true);
    try {
      await updatePrefs({ feltThemeId: "custom", feltCustomColor: color }).unwrap();
      setCustomFeltColor(color);
      await refetch();
      onSelectSfx?.();
    } catch {
      addToast(t("settings.tableThemePurchaseError"), "error");
    } finally {
      setApplyingCustomColor(false);
    }
  };

  const onBackgroundFile = async (file: File, skipUnlockCheck = false) => {
    if (!skipUnlockCheck && !customBgUnlocked) {
      await buyUnlock(CUSTOM_FELT_BACKGROUND_UNLOCK, () => fileInputRef.current?.click());
      return;
    }
    try {
      const imageData = await fileToAvatarDataUrl(file, 1920, 0.88);
      const res = await uploadBackground({ imageData }).unwrap();
      setFeltBackgroundId("custom", res.preferences.feltBackgroundUrl ?? null);
      onSelectSfx?.();
      addToast(t("settings.tableBackgroundUploaded"), "success");
    } catch {
      addToast(t("settings.tableThemePurchaseError"), "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-300">{t("settings.tableThemeShopHint")}</p>

      <div className="space-y-3">
        <p className="text-slate-300 text-sm">{t("settings.tableThemeHint")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {THEME_IDS.map((id) => {
            const unlocked = themeUnlocked(id);
            const price = feltThemePriceChips(id);
            const selected = tableTheme === id;
            const buying = purchasing && pendingId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => void selectTheme(id)}
                disabled={buying}
                className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition ${
                  selected
                    ? "border-amber-200/55 bg-amber-400/10 ring-1 ring-amber-200/20"
                    : "border-white/10 bg-white/[0.04] hover:border-blue-200/24"
                }`}
              >
                <div className="relative">
                  <div
                    className="h-14 w-full rounded-lg border border-black/20 shadow-inner"
                    style={{ background: TABLE_FELT_GRADIENTS[id] }}
                  />
                  {!unlocked ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/45">
                      {buying ? (
                        <Loader2 className="h-5 w-5 animate-spin text-amber-200" />
                      ) : (
                        <Lock className="h-5 w-5 text-amber-200" />
                      )}
                    </span>
                  ) : null}
                </div>
                <span className="text-sm font-semibold text-white">{t(`settings.tableTheme.${id}`)}</span>
                {!unlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-200">
                    <ChipIcon size="sm" />
                    {price.toLocaleString()}
                  </span>
                ) : id === "default" ? (
                  <span className="text-[10px] font-semibold text-emerald-300">{t("editProfile.avatarFree")}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{t("settings.tableCustomColorTitle")}</p>
            <p className="text-xs text-slate-400">{t("settings.tableCustomColorHint")}</p>
          </div>
          {!customColorUnlocked ? (
            <button
              type="button"
              disabled={purchasing && pendingId === CUSTOM_FELT_COLOR_UNLOCK}
              onClick={() => void applyCustomColor()}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-100"
            >
              {purchasing && pendingId === CUSTOM_FELT_COLOR_UNLOCK ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              <ChipIcon size="sm" />
              {tableUnlockPriceChips(CUSTOM_FELT_COLOR_UNLOCK).toLocaleString()}
            </button>
          ) : null}
        </div>
        {customColorUnlocked ? (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              value={draftCustomColor}
              onChange={(e) => setDraftCustomColor(e.target.value)}
              className="h-12 w-16 cursor-pointer rounded-lg border border-white/15 bg-transparent"
              aria-label={t("settings.tableCustomColorTitle")}
            />
            <div
              className="h-12 min-w-[8rem] flex-1 rounded-lg border border-black/20 shadow-inner"
              style={{ background: draftFeltGradient }}
            />
            <button
              type="button"
              disabled={isCustomColorApplied || applyingCustomColor}
              onClick={() => void applyCustomColor()}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                isCustomColorApplied
                  ? "cursor-default border-white/8 bg-slate-800/70 text-slate-500"
                  : applyingCustomColor
                    ? "cursor-wait border-white/10 bg-slate-800/50 text-slate-400"
                    : "border-white/15 text-slate-200 hover:bg-white/5"
              }`}
            >
              {isCustomColorApplied
                ? t("settings.tableCustomColorApplied")
                : applyingCustomColor
                  ? t("settings.tableCustomColorApplying")
                  : t("settings.tableCustomColorApply")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-white/10 pt-6">
        <p className="text-slate-300 text-sm">{t("settings.tableFeltBackgroundHint")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TABLE_FELT_BACKGROUND_IDS.map((id) => {
            const unlocked = bgUnlocked(id);
            const price = feltBackgroundPriceChips(id);
            const selected = feltBackgroundId === id;
            const buying = purchasing && pendingId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => void selectBackground(id)}
                disabled={buying}
                className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition ${
                  selected
                    ? "border-amber-200/55 bg-amber-400/10 ring-1 ring-amber-200/20"
                    : "border-white/10 bg-white/[0.04] hover:border-blue-200/24"
                }`}
              >
                <div className="relative">
                  <div
                    className="h-14 w-full rounded-lg border border-black/20 bg-cover bg-center shadow-inner"
                    style={{ backgroundImage: `url(${TABLE_FELT_BACKGROUND_URLS[id]})` }}
                  />
                  {!unlocked ? (
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/45">
                      {buying ? (
                        <Loader2 className="h-5 w-5 animate-spin text-amber-200" />
                      ) : (
                        <Lock className="h-5 w-5 text-amber-200" />
                      )}
                    </span>
                  ) : null}
                </div>
                <span className="text-sm font-semibold text-white">
                  {t(`settings.tableFeltBackground.${id}`)}
                </span>
                {!unlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-200">
                    <ChipIcon size="sm" />
                    {price.toLocaleString()}
                  </span>
                ) : id === "ba1" ? (
                  <span className="text-[10px] font-semibold text-emerald-300">{t("editProfile.avatarFree")}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">{t("settings.tableCustomBackgroundTitle")}</p>
            <p className="text-xs text-slate-400">{t("settings.tableCustomBackgroundHint")}</p>
          </div>
          {!customBgUnlocked ? (
            <button
              type="button"
              disabled={purchasing && pendingId === CUSTOM_FELT_BACKGROUND_UNLOCK}
              onClick={() => void buyUnlock(CUSTOM_FELT_BACKGROUND_UNLOCK)}
              className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-100"
            >
              <ChipIcon size="sm" />
              {tableUnlockPriceChips(CUSTOM_FELT_BACKGROUND_UNLOCK).toLocaleString()}
            </button>
          ) : null}
        </div>
        {customBgUnlocked ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onBackgroundFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploadingBg}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/40 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/5"
            >
              {uploadingBg ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {t("settings.tableCustomBackgroundUpload")}
            </button>
            {feltBackgroundId === "custom" && data?.preferences?.visuals?.feltBackgroundUrl ? (
              <div
                className="h-20 w-full rounded-lg border border-black/20 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${apiUrl(data.preferences.visuals.feltBackgroundUrl)})`,
                }}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
