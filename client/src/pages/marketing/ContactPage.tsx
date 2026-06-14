import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { getSiteContent } from "../../content/marketing/siteContent";
import { usePageMeta } from "../../utils/usePageMeta";

export function ContactPage() {
  const { i18n } = useTranslation();
  const contact = getSiteContent(i18n.language).contact;

  usePageMeta({
    title: `${contact.title} — Quantum Bluff`,
    description: contact.intro[0] ?? contact.email,
    canonicalPath: "/contact",
  });

  return (
    <PublicSiteShell pageTitle={contact.title}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        {contact.intro.map((p, i) => (
          <p key={`intro-${i}`} className="mb-4 text-base leading-relaxed text-slate-300">
            {p}
          </p>
        ))}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-semibold text-slate-400">{contact.emailLabel}</p>
          <a
            href={`mailto:${contact.email}`}
            className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-cyan-200 hover:text-white"
          >
            <Mail className="h-5 w-5" />
            {contact.email}
          </a>
          <p className="mt-4 text-sm text-slate-400">{contact.supportHours}</p>
        </div>
        <p className="mt-6 text-sm text-slate-500">{contact.formNote}</p>
      </div>
    </PublicSiteShell>
  );
}
