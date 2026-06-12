import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const PRIMARY_LINKS = [
  { to: "/discover", labelKey: "publicSite.nav.discover" },
  { to: "/downloads", labelKey: "publicSite.nav.downloads" },
  { to: "/news", labelKey: "publicSite.nav.news" },
  { to: "/about", labelKey: "publicSite.nav.about" },
  { to: "/contact", labelKey: "publicSite.nav.contact" },
] as const;

const LEGAL_LINKS = [
  { to: "/privacy-policy", labelKey: "publicSite.footer.privacy" },
  { to: "/terms-of-service", labelKey: "publicSite.footer.terms" },
] as const;

export function AuthPublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 mt-auto w-full max-w-md px-2 pt-8 pb-4 text-center">
      <nav
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-medium text-slate-400 sm:text-sm"
        aria-label={t("startScreen.footerNav")}
      >
        {PRIMARY_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="transition-colors hover:text-cyan-200"
          >
            {t(item.labelKey)}
          </Link>
        ))}
        <span className="hidden text-slate-600 sm:inline" aria-hidden>
          ·
        </span>
        {LEGAL_LINKS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="transition-colors hover:text-cyan-200"
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>
      <p className="mt-4 text-[10px] text-slate-500 sm:text-xs">
        © {new Date().getFullYear()} Quantum Bluff
      </p>
    </footer>
  );
}
