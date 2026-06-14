import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock } from "lucide-react";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { NewsArticleBody } from "../../components/marketing/NewsArticleBody";
import { getNewsArticle, type NewsArticle } from "../../content/marketing/siteContent";
import { getAllLandings, getFeaturedGuides } from "../../content/marketing/marketingInternalLinks";
import { apiUrl } from "../../utils/apiBase";

export function NewsArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { i18n, t } = useTranslation();
  const staticArticle = slug ? getNewsArticle(slug, i18n.language) : undefined;
  const [remoteArticle, setRemoteArticle] = useState<NewsArticle | null | undefined>(undefined);

  useEffect(() => {
    if (!slug || staticArticle) {
      setRemoteArticle(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiUrl(`/api/news/${encodeURIComponent(slug)}`));
        if (cancelled) return;
        if (!res.ok) {
          setRemoteArticle(null);
          return;
        }
        const data = (await res.json()) as { article?: NewsArticle };
        setRemoteArticle(data.article ?? null);
      } catch {
        if (!cancelled) setRemoteArticle(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, staticArticle]);

  const article = staticArticle ?? (remoteArticle === undefined ? undefined : remoteArticle ?? undefined);
  const loading = !staticArticle && remoteArticle === undefined;
  const featuredGuides = getFeaturedGuides(i18n.language).filter((g) => g.to !== `/news/${slug}`);
  const allLandings = getAllLandings(i18n.language);

  if (loading) {
    return (
      <PublicSiteShell pageTitle={t("publicSite.backToNews")}>
        <div className="mx-auto max-w-3xl px-4 py-12 text-center text-slate-400 sm:px-6">
          {t("common.loading")}
        </div>
      </PublicSiteShell>
    );
  }

  if (!article) {
    return (
      <PublicSiteShell pageTitle={t("publicSite.articleNotFound")}>
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="text-slate-400">{t("publicSite.articleNotFoundBody")}</p>
          <Link to="/news" className="mt-6 inline-block text-cyan-300 hover:text-white">
            {t("publicSite.backToNews")}
          </Link>
        </div>
      </PublicSiteShell>
    );
  }

  return (
    <PublicSiteShell>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <Link
          to="/news"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("publicSite.backToNews")}
        </Link>
        <div className="mb-4 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200"
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-black text-white sm:text-4xl">{article.title}</h1>
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
          <time dateTime={article.date}>
            {new Date(article.date).toLocaleDateString(i18n.language, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {article.readMinutes} min
          </span>
        </div>
        <div className="mt-8 border-t border-white/10 pt-8">
          <NewsArticleBody body={article.body} />
        </div>

        <aside className="mt-12 border-t border-white/10 pt-10">
          <h2 className="mb-6 text-xl font-black text-white">{t("publicSite.learnMoreTitle")}</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-cyan-300/80">
                {t("publicSite.featuredGuides")}
              </h3>
              <ul className="space-y-2">
                {featuredGuides.slice(0, 5).map((link) => (
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
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-cyan-300/80">
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
        </aside>
      </article>
    </PublicSiteShell>
  );
}
