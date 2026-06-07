import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { getSeoLanding, type SeoGameSlug } from "../../content/marketing/seoLandings";
import { usePageMeta } from "../../utils/usePageMeta";

type SeoGameLandingPageProps = {
  game: SeoGameSlug;
};

export function SeoGameLandingPage({ game }: SeoGameLandingPageProps) {
  const { i18n, t } = useTranslation();
  const content = getSeoLanding(game, i18n.language);

  usePageMeta({
    title: content.metaTitle,
    description: content.metaDescription,
    canonicalPath: content.path,
  });

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <PublicSiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-300/80">
              Quantum Bluff
            </p>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
              {content.heroTitle}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
              {content.heroSubtitle}
            </p>
            <Link
              to="/auth"
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-gradient-to-r from-blue-700 to-cyan-800 px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(59,130,246,0.35)] transition hover:scale-[1.02]"
            >
              <Sparkles className="h-4 w-4" />
              {t("publicSite.ctaPlay")}
            </Link>
          </div>
          <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
            <img
              src={content.image}
              alt={content.imageAlt}
              className="aspect-[4/3] w-full object-cover"
              width={640}
              height={480}
              loading="eager"
            />
          </figure>
        </div>
      </section>

      <section className="border-y border-white/5 bg-slate-950/40">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-2xl font-black text-white">{content.descriptionTitle}</h2>
          <div className="space-y-4">
            {content.description.map((p, i) => (
              <p key={`desc-${i}`} className="text-base leading-relaxed text-slate-300">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-2xl font-black text-white">{content.rulesTitle}</h2>
        <ol className="space-y-3">
          {content.rules.map((rule, i) => (
            <li
              key={`rule-${i}`}
              className="flex gap-3 text-sm leading-relaxed text-slate-300 sm:text-base"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-200">
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-white/5 bg-slate-950/35">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
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
