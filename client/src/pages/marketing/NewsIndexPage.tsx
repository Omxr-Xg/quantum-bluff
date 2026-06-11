import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { getSiteContent, type NewsArticle } from "../../content/marketing/siteContent";
import { apiUrl } from "../../utils/apiBase";

export function NewsIndexPage() {
  const { i18n } = useTranslation();
  const news = getSiteContent(i18n.language).news;
  const [published, setPublished] = useState<NewsArticle[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/news"));
        if (!res.ok) return;
        const data = (await res.json()) as { articles?: NewsArticle[] };
        if (!cancelled && Array.isArray(data.articles)) {
          setPublished(data.articles);
        }
      } catch {
        /* ignore — static articles still shown */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const articles = useMemo(() => {
    const staticSlugs = new Set(news.articles.map((a) => a.slug));
    const merged = [
      ...published,
      ...news.articles.filter((a) => !staticSlugs.has(a.slug)),
    ];
    return merged.sort((a, b) => b.date.localeCompare(a.date));
  }, [news.articles, published]);

  return (
    <PublicSiteShell pageTitle={news.title}>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <p className="mb-10 text-base text-slate-400">{news.subtitle}</p>
        <div className="space-y-6">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/25 hover:bg-white/[0.06]"
            >
              <div className="mb-2 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-xl font-bold text-white">
                <Link to={`/news/${article.slug}`} className="hover:text-cyan-100">
                  {article.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{article.excerpt}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <time dateTime={article.date}>
                  {new Date(article.date).toLocaleDateString(i18n.language, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readMinutes} min
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PublicSiteShell>
  );
}
