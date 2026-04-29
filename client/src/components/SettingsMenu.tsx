import { Eye, Bell, X, Palette, Volume2, ChevronDown, Sparkles, Music2, Waves, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useAudio } from "../contexts/MusicContext";
import {
  type TableThemeId,
  TABLE_FELT_GRADIENTS,
  useTableTheme,
} from "../contexts/TableThemeContext";
import type { SettingsTab } from "../contexts/AccessibilityMenuOpenContext";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CustomScrollArea } from "./CustomScrollArea";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  onRateGame?: () => void;
  hideAestheticTab?: boolean;
}

const THEME_IDS: TableThemeId[] = [
  "default",
  "vegasRed",
  "vegasPurple",
  "darkBlue",
];

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
  const { tableTheme, setTableTheme } = useTableTheme();
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
        </div>

        <CustomScrollArea className="relative z-10 min-h-0 flex-1" contentClassName="space-y-6 p-5 pr-7 sm:p-6 sm:pr-8">
          {!hideAestheticTab && tab === "aesthetic" && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm">{t("settings.tableThemeHint")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setTableTheme(id);
                      playSfx("uiSelect");
                    }}
                    className={`rounded-xl border-2 p-4 text-left transition flex flex-col gap-2 ${
                      tableTheme === id
                        ? "border-amber-200/55 bg-amber-400/10 ring-1 ring-amber-200/20 shadow-[0_0_22px_rgba(245,158,11,0.14)]"
                        : "border-white/10 bg-white/[0.04] hover:border-blue-200/24"
                    }`}
                  >
                    <div
                      className="h-14 w-full rounded-lg shadow-inner border border-black/20"
                      style={{ background: TABLE_FELT_GRADIENTS[id] }}
                    />
                    <span className="text-white font-semibold text-sm">
                      {t(`settings.tableTheme.${id}`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
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
                  <Switch
                    checked={bgmEnabled}
                    onCheckedChange={(checked) => {
                      toggleBgm(checked);
                      playSfx("uiClick");
                    }}
                    className="mt-1 data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-slate-600"
                    aria-label={t("settings.musicTitle")}
                  />
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
                  <Switch
                    checked={sfxEnabled}
                    onCheckedChange={(checked) => {
                      toggleSfx(checked);
                      if (checked) playSfx("success");
                    }}
                    className="mt-1 data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-600"
                    aria-label={t("settings.sfxTitle")}
                  />
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
