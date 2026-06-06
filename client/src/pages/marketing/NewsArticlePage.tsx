import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock } from "lucide-react";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { getNewsArticle } from "../../content/marketing/siteContent";

export function NewsArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { i18n, t } = useTranslation();
  const article = slug ? getNewsArticle(slug, i18n.language) : undefined;

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
        <div className="mt-8 space-y-5 border-t border-white/10 pt-8">
          {article.body.map((p, i) => (
            <p key={`body-${i}`} className="text-base leading-relaxed text-slate-300">
              {p}
            </p>
          ))}
        </div>
      </article>
    </PublicSiteShell>
  );
}
