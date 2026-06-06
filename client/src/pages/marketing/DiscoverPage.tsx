import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, Sparkles } from "lucide-react";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { getSiteContent } from "../../content/marketing/siteContent";

export function DiscoverPage() {
  const { i18n, t } = useTranslation();
  const content = getSiteContent(i18n.language).discover;

  return (
    <PublicSiteShell>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-300/80">
          {content.metaTitle}
        </p>
        <h1 className="text-center text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
          {content.heroTitle}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-300 sm:text-lg">
          {content.heroSubtitle}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-gradient-to-r from-blue-700 to-cyan-800 px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(59,130,246,0.35)] transition hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            {t("publicSite.ctaPlay")}
          </Link>
          <Link
            to="/news"
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
          >
            {t("publicSite.ctaNews")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-white/5 bg-slate-950/40">
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-12 sm:px-6">
          {content.intro.map((p, i) => (
            <p key={`intro-${i}`} className="text-base leading-relaxed text-slate-300">
              {p}
            </p>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-2xl font-black text-white">{content.featuresTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {content.features.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm"
            >
              <h3 className="mb-2 text-lg font-bold text-cyan-100">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-300">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-white/5 bg-slate-950/35">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h2 className="mb-4 text-2xl font-black text-white">{content.gamesTitle}</h2>
          <ul className="space-y-3">
            {content.games.map((g) => (
              <li key={g} className="flex gap-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="mb-4 text-2xl font-black text-white">{content.leaderboardTitle}</h2>
        {content.leaderboard.map((p, i) => (
          <p key={`lb-${i}`} className="mb-4 text-base leading-relaxed text-slate-300">
            {p}
          </p>
        ))}
        <h2 className="mb-4 mt-10 text-2xl font-black text-white">{content.rewardsTitle}</h2>
        {content.rewards.map((p, i) => (
          <p key={`rw-${i}`} className="mb-4 text-base leading-relaxed text-slate-300">
            {p}
          </p>
        ))}
      </section>

      <section className="border-t border-white/5 bg-slate-950/40">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-center text-2xl font-black text-white">{content.screenshotsTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {content.screenshots.map((shot) => (
              <figure
                key={shot.title}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-xl"
              >
                <img src={shot.src} alt="" className="h-40 w-full object-cover opacity-90 sm:h-48" />
                <figcaption className="p-4">
                  <p className="font-bold text-cyan-100">{shot.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{shot.caption}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-2xl font-black text-white">{content.faqTitle}</h2>
        <div className="space-y-4">
          {content.faq.map((item) => (
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
      </section>

      <section className="border-t border-cyan-500/20 bg-gradient-to-b from-blue-950/50 to-slate-950/80">
        <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-black text-white">{content.ctaTitle}</h2>
          <p className="mt-3 text-slate-300">{content.ctaBody}</p>
          <Link
            to="/auth"
            className="mt-6 inline-block rounded-full border border-cyan-300/40 bg-blue-600/40 px-10 py-3.5 text-sm font-bold text-white hover:bg-blue-500/50"
          >
            {t("publicSite.ctaPlay")}
          </Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
