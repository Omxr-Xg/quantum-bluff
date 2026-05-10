import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Globe2 } from "lucide-react";

const PANEL_W = 56; // w-14

const allLanguages = [
  { code: "fr", flag: "🇫🇷" },
  { code: "en", flag: "🇬🇧" },
  { code: "es", flag: "🇪🇸" },
  { code: "ar", flag: "🇸🇦" },
  { code: "uk", flag: "🇺🇦" },
] as const;

type LanguageSwitcherProps = {
  className?: string;
  buttonClassName?: string;
};

export const LanguageSwitcher = ({ className = "", buttonClassName = "" }: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    let left = rtl ? r.right - PANEL_W : r.left;
    const margin = 8;
    if (left + PANEL_W > window.innerWidth - margin) {
      left = window.innerWidth - PANEL_W - margin;
    }
    if (left < margin) left = margin;
    setCoords({ top: r.bottom + 8, left });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isOpen]);

  const _currentLang =
    allLanguages.find((l) => l.code === i18n.language || i18n.language.startsWith(l.code + "-")) ?? allLanguages[1];

  const panel =
    isOpen && coords
      ? createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="fixed z-[500] w-14 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="max-h-[min(50vh,14rem)] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.5)_transparent]">
              {allLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={i18n.language === lang.code || i18n.language.startsWith(lang.code + "-")}
                  onClick={() => changeLanguage(lang.code)}
                  aria-label={`${t("language.chooseLanguage")} (${lang.code})`}
                  className={`relative flex w-full items-center justify-center py-3 transition hover:bg-slate-700 ${
                    i18n.language === lang.code || i18n.language.startsWith(lang.code + "-")
                      ? "bg-slate-700 text-white"
                      : "text-gray-300"
                  }`}
                >
                  <span className="text-xl leading-none">{lang.flag}</span>
                  {(i18n.language === lang.code || i18n.language.startsWith(lang.code + "-")) && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs leading-none" aria-hidden>
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative shrink-0 overflow-visible ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        title={t("language.chooseLanguage")}
        aria-label={t("language.chooseLanguage")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={
          buttonClassName ||
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white transition hover:bg-slate-700 md:h-12 md:w-12"
        }
      >
        <Globe2 className="h-4.5 w-4.5 md:h-5 md:w-5" strokeWidth={2.2} aria-hidden />
      </button>
      {panel}
    </div>
  );
};
