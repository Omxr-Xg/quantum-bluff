import { Eye, Bell, X, Palette, Volume2, ChevronDown, Sparkles, Music2, Waves, Star, Trash2, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import { clearAuthStorage, getUsername } from "../utils/userProfile";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useAudio } from "../contexts/MusicContext";
import { TableThemeSettings } from "./TableThemeSettings";
import type { SettingsTab } from "../contexts/AccessibilityMenuOpenContext";
import { Slider } from "./ui/slider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CustomScrollArea } from "./CustomScrollArea";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  onRateGame?: () => void;
  hideAestheticTab?: boolean;
}

const settingsPanelClass =
  "rounded-2xl border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-md";

export function SettingsMenu({
  isOpen,
  onClose,
  initialTab = "aesthetic",
  onRateGame,
  hideAestheticTab = false,
}: SettingsMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    highContrast,
    toggleHighContrast,
    visualAlerts,
    toggleVisualAlerts,
    colorblindMode,
    toggleColorblindMode,
    colorblindType,
    setColorblindType,
  } = useAccessibility();
  const {
    bgmEnabled,
    bgmVolume,
    sfxEnabled,
    sfxVolume,
    toggleBgm,
    toggleSfx,
    setBgmVolume,
    setSfxVolume,
    playSfx,
  } = useAudio();
  const initialVisibleTab = hideAestheticTab && initialTab === "aesthetic" ? "audio" : initialTab;
  const [tab, setTab] = useState<SettingsTab>(initialVisibleTab);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(hideAestheticTab && initialTab === "aesthetic" ? "audio" : initialTab);
      playSfx("modalOpen");
    }
  }, [isOpen, initialTab, hideAestheticTab, playSfx]);

  useEffect(() => {
    if (hideAestheticTab && tab === "aesthetic") setTab("audio");
  }, [hideAestheticTab, tab]);

  if (!isOpen) return null;

  const selectTab = (nextTab: SettingsTab) => {
    setTab(nextTab);
    playSfx("uiSelect");
  };

  const close = () => {
    playSfx("modalClose");
    onClose();
  };

  const handleExportData = async () => {
    const token = getAuthItem("token");
    if (!token) {
      setExportError(t("settings.exportDataNotLoggedIn"));
      return;
    }

    setExportLoading(true);
    setExportError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/export"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setExportError(data.error ?? t("settings.exportDataError"));
        return;
      }
      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `quantum-bluff-export-${stamp}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      playSfx("uiSelect");
    } catch {
      setExportError(t("settings.exportDataError"));
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const username = getUsername();
    if (!window.confirm(t("settings.deleteAccountConfirm", { username }))) return;

    const token = getAuthItem("token");
    if (!token) {
      setDeleteError(t("settings.deleteAccountNotLoggedIn"));
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const body: { password?: string; confirmUsername?: string } = {};
      if (deletePassword.trim()) body.password = deletePassword;
      if (deleteConfirmUsername.trim()) body.confirmUsername = deleteConfirmUsername.trim();

      const res = await fetch(apiUrl("/api/auth/account"), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error ?? t("settings.deleteAccountError"));
        return;
      }
      clearAuthStorage();
      close();
      navigate("/auth", { replace: true });
    } catch {
      setDeleteError(t("settings.deleteAccountError"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderTabButton = (id: SettingsTab, label: string) => (
    <button
      type="button"
      onClick={() => selectTab(id)}
      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
        tab === id
          ? "border-amber-200/50 bg-amber-400/14 text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-amber-200/15"
          : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-blue-200/24 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex h-[42rem] max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-300/20 bg-[#070b12] shadow-[0_24px_80px_rgba(0,0,0,0.62),0_0_24px_rgba(245,158,11,0.08)] transition-[height,max-height] duration-300 ease-out">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(245,158,11,0.10),transparent_36%),radial-gradient(circle_at_100%_35%,rgba(30,64,175,0.14),transparent_42%),linear-gradient(160deg,rgba(8,13,24,0.98)_0%,rgba(3,7,18,0.98)_58%,rgba(11,10,8,0.98)_100%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />

        <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-200/25 bg-amber-400/10 shadow-[0_0_24px_rgba(245,158,11,0.16)]">
              <Sparkles className="h-6 w-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-amber-50">
                {t("settings.title")}
              </h2>
              <p className="text-sm text-slate-400">{t("settings.subtitle")}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              aria-label={t("settings.close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 gap-2 border-b border-white/10 px-5 py-4 sm:px-6">
          {!hideAestheticTab && renderTabButton("aesthetic", t("settings.tabAesthetic"))}
          {renderTabButton("audio", t("settings.tabAudio"))}
          {renderTabButton("accessibility", t("settings.tabAccessibility"))}
          {renderTabButton("account", t("settings.tabAccount"))}
        </div>

        <CustomScrollArea className="relative z-10 min-h-0 flex-1" contentClassName="space-y-6 p-5 pr-7 sm:p-6 sm:pr-8">
          {!hideAestheticTab && tab === "aesthetic" && (
            <TableThemeSettings onSelectSfx={() => playSfx("uiSelect")} />
          )}

          {tab === "audio" && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm">{t("settings.audioHint")}</p>

              <div className={`p-5 ${settingsPanelClass}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/25 bg-amber-400/12">
                      <Music2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{t("settings.musicTitle")}</h3>
                      <p className="text-gray-400 text-sm">{t("settings.musicHint")}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toggleBgm(!bgmEnabled);
                      playSfx("uiClick");
                    }}
                    className={`relative w-16 h-8 rounded-full transition-all ${
                      bgmEnabled ? "bg-green-600" : "bg-slate-600"
                    }`}
                    aria-pressed={bgmEnabled}
                    aria-label={t("settings.musicTitle")}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        bgmEnabled ? "translate-x-8" : ""
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <Slider
                    value={[Math.round(bgmVolume * 100)]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([value]) => setBgmVolume(value / 100)}
                    onValueCommit={() => playSfx("uiSelect")}
                    className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-slate-700 [&_[data-slot=slider-range]]:bg-amber-400 [&_[data-slot=slider-thumb]]:border-amber-300"
                    aria-label={t("settings.musicVolume")}
                  />
                  <span className="w-12 text-right text-sm tabular-nums text-amber-100">
                    {Math.round(bgmVolume * 100)}%
                  </span>
                </div>
              </div>

              <div className={`p-5 ${settingsPanelClass}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200/25 bg-blue-400/12">
                      <Waves className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{t("settings.sfxTitle")}</h3>
                      <p className="text-gray-400 text-sm">{t("settings.sfxHint")}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !sfxEnabled;
                      toggleSfx(next);
                      if (next) playSfx("success");
                    }}
                    className={`relative w-16 h-8 rounded-full transition-all ${
                      sfxEnabled ? "bg-green-600" : "bg-slate-600"
                    }`}
                    aria-pressed={sfxEnabled}
                    aria-label={t("settings.sfxTitle")}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        sfxEnabled ? "translate-x-8" : ""
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <Slider
                    value={[Math.round(sfxVolume * 100)]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([value]) => setSfxVolume(value / 100)}
                    onValueCommit={() => playSfx("uiSelect")}
                    className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-slate-700 [&_[data-slot=slider-range]]:bg-cyan-400 [&_[data-slot=slider-thumb]]:border-cyan-300"
                    aria-label={t("settings.sfxVolume")}
                  />
                  <span className="w-12 text-right text-sm tabular-nums text-cyan-100">
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === "account" && (
            <div className="space-y-4">
              <div className={`rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-5 ${settingsPanelClass}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/15">
                    <Download className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-cyan-100">{t("settings.exportDataTitle")}</h3>
                      <p className="text-sm text-cyan-200/80">{t("settings.exportDataHint")}</p>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">{t("settings.exportDataBody")}</p>
                    {exportError ? (
                      <p className="text-sm text-rose-300" role="alert">
                        {exportError}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={exportLoading}
                      onClick={() => void handleExportData()}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/45 bg-cyan-900/60 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      {exportLoading ? t("settings.exportDataLoading") : t("settings.exportDataCta")}
                    </button>
                  </div>
                </div>
              </div>
              <div className={`rounded-xl border border-red-500/30 bg-red-950/25 p-5 ${settingsPanelClass}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-400/30 bg-red-500/15">
                    <Trash2 className="h-5 w-5 text-red-200" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-red-100">{t("settings.deleteAccountTitle")}</h3>
                      <p className="text-sm text-red-200/80">{t("settings.deleteAccountHint")}</p>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">{t("settings.deleteAccountBody")}</p>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-sm text-slate-300" htmlFor="delete-account-password">
                          {t("settings.deleteAccountPasswordLabel")}
                        </label>
                        <input
                          id="delete-account-password"
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                          placeholder={t("settings.deleteAccountPasswordPlaceholder")}
                          autoComplete="current-password"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm text-slate-300" htmlFor="delete-account-username">
                          {t("settings.deleteAccountUsernameLabel", { username: getUsername() })}
                        </label>
                        <input
                          id="delete-account-username"
                          type="text"
                          value={deleteConfirmUsername}
                          onChange={(e) => setDeleteConfirmUsername(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/55 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-400/20"
                          placeholder={getUsername()}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    {deleteError && (
                      <p className="text-sm text-red-300" role="alert">
                        {deleteError}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={deleteLoading}
                      onClick={() => void handleDeleteAccount()}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-900/70 px-4 py-2.5 text-sm font-semibold text-red-50 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                      {deleteLoading ? t("settings.deleteAccountLoading") : t("settings.deleteAccountCta")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "accessibility" && (
            <>
              <div className={`p-6 ${settingsPanelClass}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-yellow-200/30 bg-yellow-400/14">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {t("accessibility.highContrastTitle")}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {t("accessibility.highContrastHint")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleHighContrast}
                    className={`relative w-16 h-8 rounded-full transition-all ${
                      highContrast ? "bg-green-600" : "bg-slate-600"
                    }`}
                    aria-pressed={highContrast}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        highContrast ? "translate-x-8" : ""
                      }`}
                    />
                  </button>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t("accessibility.highContrastBody")}
                </p>
              </div>

              <div className={`p-6 ${settingsPanelClass}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200/30 bg-blue-400/14">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {t("accessibility.visualAlertsTitle")}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {t("accessibility.visualAlertsHint")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleVisualAlerts}
                    className={`relative w-16 h-8 rounded-full transition-all ${
                      visualAlerts ? "bg-green-600" : "bg-slate-600"
                    }`}
                    aria-pressed={visualAlerts}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        visualAlerts ? "translate-x-8" : ""
                      }`}
                    />
                  </button>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t("accessibility.visualAlertsBody")}
                </p>
              </div>

              <div
                className={`rounded-xl p-6 border transition-all ${
                  colorblindMode
                    ? "border-blue-200/30 bg-blue-400/10"
                    : "border-white/10 bg-white/[0.045]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/30 bg-rose-400/14">
                      <Palette className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {t("accessibility.colorblindTitle")}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {t("accessibility.colorblindHint")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleColorblindMode}
                    className={`relative w-16 h-8 rounded-full transition-all ${
                      colorblindMode ? "bg-green-600" : "bg-slate-600"
                    }`}
                    aria-pressed={colorblindMode}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        colorblindMode ? "translate-x-8" : ""
                      }`}
                    />
                  </button>
                </div>

                {colorblindMode && (
                  <div className="mt-6 pt-5 border-t border-slate-700 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t("accessibility.colorblindSelectLabel")}
                    </label>
                    <div className="relative">
                      <select
                        value={colorblindType || "protanopia"}
                        onChange={(e) => setColorblindType?.(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 appearance-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all cursor-pointer"
                      >
                        <option value="protanopia">
                          {t("accessibility.colorblindProtanopia")}
                        </option>
                        <option value="deuteranopia">
                          {t("accessibility.colorblindDeuteranopia")}
                        </option>
                        <option value="tritanopia">
                          {t("accessibility.colorblindTritanopia")}
                        </option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Volume2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-green-400 font-semibold mb-1">
                      {t("accessibility.savedInfoTitle")}
                    </h4>
                    <p className="text-gray-300 text-sm">
                      {t("accessibility.savedInfoBody")}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CustomScrollArea>

        {onRateGame && (
          <div className="relative z-10 shrink-0 border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={() => {
                playSfx("uiClick");
                onRateGame();
                close();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-950/40 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-900/50"
            >
              <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-300" aria-hidden />
              {t("settings.rateGameCta")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
