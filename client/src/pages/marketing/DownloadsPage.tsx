import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "../../utils/usePageMeta";
import { Download, Laptop, RefreshCw, Shield, Smartphone, Sparkles, Zap } from "lucide-react";
import { PublicSiteShell } from "../../components/marketing/PublicSiteShell";
import { AndroidLogo, AppleLogo, WindowsLogo } from "../../components/marketing/PlatformLogos";
import {
  ANDROID_APK,
  APP_RELEASE_VERSION,
  DESKTOP_PLATFORMS,
  resolveAppDownloadUrl,
} from "../../config/appDownloads";

type DownloadTab = "desktop" | "android";

const cardClass =
  "rounded-2xl border border-white/10 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-xl";

const tabActive =
  "border-cyan-300/45 bg-cyan-950/55 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.15)]";
const tabInactive =
  "border-white/10 bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-200";

const featureIcons = [Zap, RefreshCw, Shield, Sparkles] as const;

export function DownloadsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DownloadTab>("desktop");

  usePageMeta({
    title: t("downloads.metaTitle"),
    description: t("downloads.metaDescription"),
    canonicalPath: "/downloads",
  });

  const windows = DESKTOP_PLATFORMS.find((p) => p.id === "windows")!;
  const macDmg = DESKTOP_PLATFORMS.find((p) => p.id === "macDmg")!;
  const macZip = DESKTOP_PLATFORMS.find((p) => p.id === "macZip")!;

  const heroTitle = tab === "desktop" ? t("downloads.heroTitle") : t("downloads.android.heroTitle");
  const heroSubtitle =
    tab === "desktop" ? t("downloads.heroSubtitle") : t("downloads.android.heroSubtitle");

  return (
    <PublicSiteShell pageTitle={t("downloads.pageTitle")}>
      <section className="relative overflow-hidden border-b border-white/5">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(59,130,246,0.28),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_20%,rgba(168,85,247,0.18),transparent_50%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.4em] text-cyan-300/85">
            {t("downloads.eyebrow")}
          </p>
          <h2 className="text-center text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
            {heroTitle}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed text-slate-300 sm:text-lg">
            {heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-full border border-cyan-300/30 bg-cyan-950/40 px-4 py-1.5 text-xs font-bold text-cyan-100">
              {t("downloads.versionBadge", { version: APP_RELEASE_VERSION })}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-300">
              {t("downloads.freeBadge")}
            </span>
          </div>

          <div
            className="mx-auto mt-10 flex max-w-md rounded-2xl border border-white/10 bg-slate-950/50 p-1.5"
            role="tablist"
            aria-label={t("downloads.tabsAria")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "desktop"}
              onClick={() => setTab("desktop")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${tab === "desktop" ? tabActive : tabInactive}`}
            >
              <Laptop className="h-4 w-4 shrink-0" />
              {t("downloads.tabDesktop")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "android"}
              onClick={() => setTab("android")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${tab === "android" ? tabActive : tabInactive}`}
            >
              <Smartphone className="h-4 w-4 shrink-0" />
              {t("downloads.tabAndroid")}
            </button>
          </div>
        </div>
      </section>

      {tab === "desktop" ? (
        <>
          <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="grid gap-6 lg:grid-cols-2">
              <article className={`relative overflow-hidden p-6 sm:p-8 ${cardClass}`}>
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl"
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-300/25 bg-[#0078D4]/15">
                      <WindowsLogo className="h-9 w-9" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{t("downloads.windows.title")}</h3>
                      <p className="text-sm text-slate-400">{t(`downloads.platform.${windows.archKey}`)}</p>
                    </div>
                  </div>
                  <p className="mb-6 text-sm leading-relaxed text-slate-300">{t("downloads.windows.desc")}</p>
                  <ul className="mb-8 space-y-2 text-sm text-slate-400">
                    {(t("downloads.windows.steps", { returnObjects: true }) as string[]).map((step) => (
                      <li key={step} className="flex gap-2">
                        <span className="text-sky-400">•</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={resolveAppDownloadUrl(windows.fileName)}
                    download
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300/35 bg-gradient-to-r from-[#0078D4]/90 to-blue-900/90 px-6 py-3.5 text-sm font-bold text-white shadow-[0_0_28px_rgba(0,120,212,0.3)] transition hover:scale-[1.01] hover:border-sky-200/45 sm:w-auto"
                  >
                    <Download className="h-4 w-4" />
                    {t("downloads.downloadButton")}
                    <span className="text-sky-200/80">({windows.sizeLabel})</span>
                  </a>
                </div>
              </article>

              <article className={`relative overflow-hidden p-6 sm:p-8 ${cardClass}`}>
                <div
                  className="pointer-events-none absolute -left-6 -top-6 h-40 w-40 rounded-full bg-violet-500/15 blur-3xl"
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-slate-900/80 text-white">
                      <AppleLogo className="h-9 w-9" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{t("downloads.mac.title")}</h3>
                      <p className="text-sm text-slate-400">{t(`downloads.platform.${macDmg.archKey}`)}</p>
                    </div>
                  </div>
                  <p className="mb-6 text-sm leading-relaxed text-slate-300">{t("downloads.mac.desc")}</p>
                  <ul className="mb-6 space-y-2 text-sm text-slate-400">
                    {(t("downloads.mac.steps", { returnObjects: true }) as string[]).map((step) => (
                      <li key={step} className="flex gap-2">
                        <span className="text-violet-300">•</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a
                      href={resolveAppDownloadUrl(macDmg.fileName)}
                      download
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:border-white/25 hover:bg-slate-800/90"
                    >
                      <Download className="h-4 w-4" />
                      {t("downloads.mac.dmgButton")}
                      <span className="text-slate-400">({macDmg.sizeLabel})</span>
                    </a>
                    <a
                      href={resolveAppDownloadUrl(macZip.fileName)}
                      download
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                    >
                      {t("downloads.mac.zipButton")}
                      <span className="text-slate-500">({macZip.sizeLabel})</span>
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
            <h2 className="mb-6 text-2xl font-black text-white">{t("downloads.requirementsTitle")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className={`p-5 ${cardClass}`}>
                <h3 className="mb-3 flex items-center gap-3 font-bold text-white">
                  <WindowsLogo className="h-5 w-5" />
                  Windows
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(t("downloads.requirements.windows", { returnObjects: true }) as string[]).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className={`p-5 ${cardClass}`}>
                <h3 className="mb-3 flex items-center gap-3 font-bold text-white">
                  <AppleLogo className="h-5 w-5 text-white" />
                  macOS
                </h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(t("downloads.requirements.mac", { returnObjects: true }) as string[]).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <article className={`relative overflow-hidden p-6 sm:p-10 ${cardClass}`}>
            <div
              className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-emerald-500/12 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <div className="mb-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/25 bg-emerald-950/40">
                  <AndroidLogo className="h-11 w-11" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">{t("downloads.android.title")}</h3>
                  <p className="mt-1 text-sm text-slate-400">{t(`downloads.platform.${ANDROID_APK.archKey}`)}</p>
                </div>
              </div>

              <p className="mb-6 text-center text-sm leading-relaxed text-slate-300 sm:text-left">
                {t("downloads.android.desc")}
              </p>

              <ul className="mb-8 space-y-2 text-sm text-slate-400">
                {(t("downloads.android.steps", { returnObjects: true }) as string[]).map((step) => (
                  <li key={step} className="flex gap-2">
                    <span className="text-emerald-400">•</span>
                    {step}
                  </li>
                ))}
              </ul>

              <a
                href={resolveAppDownloadUrl(ANDROID_APK.fileName)}
                download
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/35 bg-gradient-to-r from-emerald-800/90 to-green-900/90 px-8 py-4 text-base font-bold text-white shadow-[0_0_32px_rgba(52,211,153,0.22)] transition hover:scale-[1.01] hover:border-emerald-300/50"
              >
                <Download className="h-5 w-5" />
                {t("downloads.android.downloadButton")}
                <span className="text-emerald-200/80">({ANDROID_APK.sizeLabel})</span>
              </a>

              <p className="mt-6 rounded-xl border border-amber-300/20 bg-amber-950/25 px-4 py-3 text-center text-xs leading-relaxed text-amber-100/90 sm:text-left">
                {t("downloads.android.sideloadHint")}
              </p>
            </div>
          </article>

          <div className={`mt-6 p-5 ${cardClass}`}>
            <h3 className="mb-3 flex items-center gap-3 font-bold text-white">
              <AndroidLogo className="h-5 w-5" />
              Android
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {(t("downloads.requirements.android", { returnObjects: true }) as string[]).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="border-y border-white/5 bg-slate-950/45">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-black text-white">
            {tab === "desktop" ? t("downloads.featuresTitle") : t("downloads.android.featuresTitle")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              (tab === "desktop"
                ? t("downloads.features", { returnObjects: true })
                : t("downloads.android.features", { returnObjects: true })) as { title: string; body: string }[]
            ).map((f, i) => {
              const Icon = featureIcons[i] ?? Sparkles;
              return (
                <article
                  key={f.title}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-5 text-center sm:text-left"
                >
                  <div className="mb-3 inline-flex rounded-lg border border-cyan-300/20 bg-cyan-950/35 p-2.5">
                    <Icon className="h-5 w-5 text-cyan-200" />
                  </div>
                  <h3 className="font-bold text-cyan-50">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-slate-950/40">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-2xl font-black text-white">{t("downloads.faqTitle")}</h2>
          <div className="space-y-3">
            {(
              (tab === "desktop"
                ? t("downloads.faq", { returnObjects: true })
                : t("downloads.android.faq", { returnObjects: true })) as { q: string; a: string }[]
            ).map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 open:bg-white/[0.05]"
              >
                <summary className="cursor-pointer list-none font-semibold text-slate-100 marker:content-none [&::-webkit-details-marker]:hidden">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
        <p className="text-sm text-slate-400">{t("downloads.webHint")}</p>
        <Link
          to="/auth"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-blue-600/25 px-8 py-3 text-sm font-bold text-cyan-50 transition hover:bg-blue-500/35"
        >
          <Sparkles className="h-4 w-4" />
          {t("publicSite.ctaPlay")}
        </Link>
      </section>
    </PublicSiteShell>
  );
}
