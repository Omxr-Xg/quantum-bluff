import type { ReactNode } from "react";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { usePageMeta } from "../../utils/usePageMeta";

type Section = { heading: string; paragraphs: string[] };

type MarketingTextPageProps = {
  title: string;
  metaDescription?: string;
  canonicalPath?: string;
  lastUpdated?: string;
  sections: Section[];
  extra?: ReactNode;
};

export function MarketingTextPage({
  title,
  metaDescription,
  canonicalPath,
  lastUpdated,
  sections,
  extra,
}: MarketingTextPageProps) {
  const description =
    metaDescription ?? sections[0]?.paragraphs[0]?.slice(0, 160) ?? title;
  usePageMeta({
    title: `${title} — Quantum Bluff`,
    description,
    canonicalPath,
  });

  return (
    <PublicSiteShell pageTitle={title}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        {lastUpdated ? (
          <p className="mb-8 text-sm text-slate-500">
            {lastUpdated}
          </p>
        ) : null}
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-4 text-xl font-bold text-cyan-100">{section.heading}</h2>
              {section.paragraphs.map((p, i) => (
                <p key={`${section.heading}-${i}`} className="mb-4 text-base leading-relaxed text-slate-300">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
        {extra}
      </div>
    </PublicSiteShell>
  );
}
