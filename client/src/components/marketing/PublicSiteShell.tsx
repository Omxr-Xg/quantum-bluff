import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { QuantumBluffLogo } from "../../assets/logo";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { ClientAuthShellBackground } from "../ClientAuthShellBackground";

const PUBLIC_LANG_BUTTON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-950/55 text-cyan-100 backdrop-blur-sm transition hover:border-cyan-300/35 hover:bg-white/5 sm:h-10 sm:w-10";

type PublicSiteShellProps = {
  children: ReactNode;
  /** Titre affiché sous le header sur mobile */
  pageTitle?: string;
};

const NAV = [
  { to: "/discover", key: "discover" },
  { to: "/news", key: "news" },
  { to: "/about", key: "about" },
  { to: "/contact", key: "contact" },
] as const;

const FOOTER_LEGAL = [
  { to: "/privacy-policy", key: "privacy" },
  { to: "/terms-of-service", key: "terms" },
  { to: "/about", key: "about" },
  { to: "/contact", key: "contact" },
] as const;

export function PublicSiteShell({ children, pageTitle }: PublicSiteShellProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <ClientAuthShellBackground background="bac2" layout="fullPage">
      <div className="relative z-10 flex min-h-[100dvh] w-full min-w-0 flex-col">
        <header className="sticky top-0 z-30 w-full border-b border-blue-300/20 bg-slate-950/75 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <LanguageSwitcher buttonClassName={PUBLIC_LANG_BUTTON} />
              <Link to="/" className="flex min-w-0 items-center gap-2.5">
                <QuantumBluffLogo alt="" className="h-9 w-9 shrink-0 brightness-110" />
                <span className="hidden bg-gradient-to-r from-blue-200 to-cyan-100 bg-clip-text text-sm font-black uppercase tracking-wider text-transparent sm:inline">
                  Quantum Bluff
                </span>
              </Link>
            </div>
            <nav className="flex flex-wrap items-center gap-1 text-xs font-semibold sm:gap-2 sm:text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-2.5 py-1.5 transition sm:px-3 ${
                    pathname === item.to ||
                    (item.to === "/discover" && pathname === "/") ||
                    (item.to === "/news" && pathname.startsWith("/news"))
                      ? "bg-blue-500/20 text-cyan-100"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {t(`publicSite.nav.${item.key}`)}
                </Link>
              ))}
              <Link
                to="/auth"
                className="ml-1 rounded-full border border-cyan-300/35 bg-blue-600/30 px-3 py-1.5 text-cyan-50 transition hover:bg-blue-500/40 sm:ml-2"
              >
                {t("publicSite.login")}
              </Link>
            </nav>
          </div>
        </header>

        <main className="w-full min-w-0 flex-1">
          {pageTitle ? (
            <div className="w-full border-b border-white/5 bg-slate-950/30">
              <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{pageTitle}</h1>
              </div>
            </div>
          ) : null}
          {children}
        </main>

        <footer className="w-full border-t border-blue-300/15 bg-slate-950/80">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-slate-400">{t("publicSite.footerTagline")}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-300">
              {FOOTER_LEGAL.map((item) => (
                <Link key={item.to} to={item.to} className="hover:text-cyan-200">
                  {t(`publicSite.footer.${item.key}`)}
                </Link>
              ))}
            </div>
          </div>
          <p className="pb-6 text-center text-[10px] text-slate-500">© {new Date().getFullYear()} Quantum Bluff</p>
        </footer>
      </div>
    </ClientAuthShellBackground>
  );
}
