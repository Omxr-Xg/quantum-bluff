import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Crown,
  Sparkles,
  Mic,
  Users,
  MessageCircle,
  Trophy,
  Award,
  UserPlus,
  Gift,
  Smartphone,
  Zap,
  TrendingUp,
} from "lucide-react";
import { QuantumBluffLogo } from "../../assets/logo";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { getSiteContent } from "../../content/marketing/siteContent";
import { GAME_SEO_PATHS, getAllLandings, getFeaturedGuides } from "../../content/marketing/marketingInternalLinks";

const SOCIAL_ICONS = [Mic, Users, MessageCircle, Trophy, Award, UserPlus] as const;
const WHY_ICONS = [Gift, Smartphone, Zap, TrendingUp] as const;

export function HomePage() {
  const { i18n, t } = useTranslation();
  const home = getSiteContent(i18n.language).home;
  const featuredGuides = getFeaturedGuides(i18n.language);
  const allLandings = getAllLandings(i18n.language);

  return (
    <PublicSiteShell>
      {/* Hero */}
      <section className="relative w-full overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
          <div className="mb-8">
            <QuantumBluffLogo
              alt="Quantum Bluff"
              className="mx-auto h-28 w-28 brightness-110 sm:h-36 sm:w-36"
              style={{ filter: "drop-shadow(0 0 30px rgba(59, 130, 246, 0.42))" }}
            />
          </div>
          <h1 className="bg-gradient-to-r from-blue-200 via-cyan-100 to-blue-300 bg-clip-text text-4xl font-black text-transparent sm:text-6xl">
            Quantum Bluff
          </h1>
          <p className="mt-4 max-w-xl text-base font-light italic tracking-wide text-cyan-100/90 sm:text-lg">
            {t("app.slogan")}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            {getSiteContent(i18n.language).discover.heroSubtitle}
          </p>
          <Link
            to="/auth"
            className="group relative mt-10 inline-flex items-center gap-3 overflow-hidden rounded-full border-2 border-blue-200/45 px-12 py-4 text-lg font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.42)] transition hover:scale-[1.03] hover:border-cyan-200"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-blue-600/85 to-cyan-950/90" />
            <span className="relative z-10 flex items-center gap-3">
              <Crown className="h-6 w-6 text-cyan-100" />
              {t("publicSite.ctaPlay")}
              <Sparkles className="h-6 w-6 text-cyan-100" />
            </span>
          </Link>
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]" />
            {t("startScreen.serverOnline")}
          </p>
        </div>
      </section>

      {/* Section 1 — Qu'est-ce que Quantum Bluff ? */}
      <section className="w-full border-b border-white/5 bg-slate-950/55">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-black text-white sm:text-3xl">{home.whatIsTitle}</h2>
          <div className="space-y-5">
            {home.whatIs.map((p, i) => (
              <p key={`what-${i}`} className="text-base leading-relaxed text-slate-300">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — Jeux */}
      <section className="w-full px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
        <h2 className="mb-10 text-center text-2xl font-black text-white sm:text-3xl">{home.gamesTitle}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {home.games.map((game) => {
            const seoPath = GAME_SEO_PATHS[game.id];
            const card = (
              <>
                <img
                  src={game.screenshot}
                  alt=""
                  className="h-44 w-full bg-slate-950/80 object-contain p-2 sm:h-52"
                />
                <div className="p-5">
                  <h3 className="text-lg font-bold text-cyan-100">{game.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{game.description}</p>
                  {seoPath ? (
                    <p className="mt-3 text-xs font-semibold text-cyan-400/90">→ {t("publicSite.learnMoreTitle")}</p>
                  ) : null}
                </div>
              </>
            );
            return (
              <article
                key={game.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-cyan-400/20"
              >
                {seoPath ? (
                  <Link to={seoPath} className="block hover:bg-white/[0.02]">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </article>
            );
          })}
        </div>
        </div>
      </section>

      {/* Section 3 — Social */}
      <section className="w-full border-y border-white/5 bg-slate-950/50">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-black text-white sm:text-3xl">{home.socialTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.social.map((item, i) => {
              const Icon = SOCIAL_ICONS[i] ?? Users;
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <Icon className="mb-3 h-6 w-6 text-cyan-300" aria-hidden />
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 4 — Pourquoi */}
      <section className="w-full px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
        <h2 className="mb-10 text-center text-2xl font-black text-white sm:text-3xl">{home.whyTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {home.why.map((item, i) => {
            const Icon = WHY_ICONS[i] ?? Sparkles;
            return (
              <article
                key={item.title}
                className="flex gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-950/40 to-slate-950/60 p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                  <Icon className="h-6 w-6 text-cyan-300" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-cyan-100">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
        </div>
      </section>

      {/* Section 5 — FAQ */}
      <section className="w-full border-t border-white/5 bg-slate-950/55">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-black text-white sm:text-3xl">{home.faqTitle}</h2>
          <div className="space-y-3">
            {home.faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 open:bg-white/[0.06]"
              >
                <summary className="cursor-pointer list-none font-semibold text-slate-100 marker:content-none">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Section — Guides et pages jeux */}
      <section className="w-full border-t border-white/5 bg-slate-950/55">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-black text-white sm:text-3xl">
            {t("publicSite.learnMoreTitle")}
          </h2>
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-cyan-300/80">
                {t("publicSite.featuredGuides")}
              </h3>
              <ul className="space-y-2">
                {featuredGuides.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-slate-300 underline decoration-cyan-500/30 underline-offset-2 hover:text-cyan-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-cyan-300/80">
                {t("publicSite.allGames")}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {allLandings.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-slate-300 underline decoration-white/10 underline-offset-2 hover:text-cyan-100"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="w-full border-t border-cyan-500/20 bg-gradient-to-b from-blue-950/60 to-slate-950/90">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black text-white">{home.ctaTitle}</h2>
          <p className="mt-3 text-slate-300">{home.ctaBody}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-blue-600/40 px-10 py-3.5 text-sm font-bold text-white hover:bg-blue-500/50"
            >
              <Sparkles className="h-4 w-4" />
              {t("publicSite.ctaPlay")}
            </Link>
            <Link
              to="/downloads"
              className="rounded-full border border-white/15 px-8 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              {t("publicSite.ctaDownloads")}
            </Link>
            <Link
              to="/news"
              className="rounded-full border border-white/15 px-8 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              {t("publicSite.ctaNews")}
            </Link>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
}
