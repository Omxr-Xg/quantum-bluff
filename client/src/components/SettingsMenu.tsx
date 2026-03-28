import { Eye, Bell, X, Palette, Volume2, ChevronDown, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccessibility } from "../contexts/AccessibilityContext";
import {
  type TableThemeId,
  TABLE_FELT_GRADIENTS,
  useTableTheme,
} from "../contexts/TableThemeContext";
import type { SettingsTab } from "../contexts/AccessibilityMenuOpenContext";

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
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
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

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

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-all"
            aria-label={t("settings.close")}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-2 border-b border-slate-700/80">
          <button
            type="button"
            onClick={() => setTab("aesthetic")}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-semibold transition ${
              tab === "aesthetic"
                ? "bg-slate-700 text-white border border-b-0 border-slate-600"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t("settings.tabAesthetic")}
          </button>
          <button
            type="button"
            onClick={() => setTab("accessibility")}
            className={`px-4 py-2.5 rounded-t-lg text-sm font-semibold transition ${
              tab === "accessibility"
                ? "bg-slate-700 text-white border border-b-0 border-slate-600"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t("settings.tabAccessibility")}
          </button>
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
                    onClick={() => setTableTheme(id)}
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
      </div>
    </div>
  );
}
