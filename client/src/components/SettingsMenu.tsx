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

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  onRateGame?: () => void;
}

const THEME_IDS: TableThemeId[] = [
  "default",
  "vegasRed",
  "vegasPurple",
  "darkBlue",
];

export function SettingsMenu({
  isOpen,
  onClose,
  initialTab = "aesthetic",
  onRateGame,
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
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      playSfx("modalOpen");
    }
  }, [isOpen, initialTab, playSfx]);

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
      className={`px-4 py-2.5 rounded-t-lg text-sm font-semibold transition ${
        tab === id
          ? "bg-slate-700 text-white border border-b-0 border-slate-600"
          : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-lg ring-2 ring-amber-500/40">
              <Sparkles className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {t("settings.title")}
              </h2>
              <p className="text-gray-400 text-sm">{t("settings.subtitle")}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={close}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 transition-all hover:bg-slate-600"
              aria-label={t("settings.close")}
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="px-6 pt-4 flex gap-2 border-b border-slate-700/80">
          {renderTabButton("aesthetic", t("settings.tabAesthetic"))}
          {renderTabButton("audio", t("settings.tabAudio"))}
          {renderTabButton("accessibility", t("settings.tabAccessibility"))}
        </div>

        <div className="p-6 space-y-6">
          {tab === "aesthetic" && (
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
                        ? "border-amber-400 bg-slate-800/80 ring-2 ring-amber-500/30"
                        : "border-slate-600 bg-slate-800/40 hover:border-slate-500"
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

              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
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

              <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-700 rounded-full flex items-center justify-center">
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
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
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

              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
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
                    ? "bg-slate-800 border-slate-600"
                    : "bg-slate-800/50 border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
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

              <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-4">
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
        </div>

        {onRateGame && (
          <div className="border-t border-slate-700/80 px-6 py-4">
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
