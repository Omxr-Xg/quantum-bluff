import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  ImagePlus,
  Loader2,
  Palette,
  Save,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { apiUrl } from "../../utils/apiBase";
import { getAuthItem } from "../../utils/authStorage";
import { adminGlassPanelClass } from "../AdminShellBackground";
import {
  applyTemplate,
  COSMETIC_STUDIO_TEMPLATES,
  type CosmeticTemplate,
} from "../../features/adminCosmetics/cosmeticStudioTemplates";
import {
  bannerBackgroundPreview,
  buildBannerPayload,
  buildFramePayload,
  buildTitlePayload,
  DEFAULT_BANNER,
  DEFAULT_FRAME,
  DEFAULT_TITLE,
  frameGlowCss,
  titleShadowCss,
  type BannerEditorState,
  type CosmeticStudioType,
  type FrameEditorState,
  type TitleEditorState,
} from "../../features/adminCosmetics/cosmeticStyleUtils";
import { CosmeticAvatar, CosmeticBannerCard, CosmeticTitle } from "../PlayerCosmetics";

const adminInputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900/75 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

type AdminCosmeticRow = {
  id: string;
  type: string;
  nameKey: string;
  purchasable: boolean;
  rarity: string | null;
  styleJson: string | null;
  isCatalog: boolean;
};

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function AdminCosmeticStudio() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cosmeticType, setCosmeticType] = useState<CosmeticStudioType>("BANNER");
  const [banner, setBanner] = useState<BannerEditorState>(DEFAULT_BANNER);
  const [frame, setFrame] = useState<FrameEditorState>(DEFAULT_FRAME);
  const [title, setTitle] = useState<TitleEditorState>(DEFAULT_TITLE);
  const [displayName, setDisplayName] = useState("");
  const [cosmeticId, setCosmeticId] = useState("");
  const [grantUsername, setGrantUsername] = useState("");

  const [catalog, setCatalog] = useState<AdminCosmeticRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/console/cosmetics"), { headers: authHeaders() });
      const data = (await res.json()) as { items?: AdminCosmeticRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? t("adminConsole.loadError"));
      setCatalog(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminConsole.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const applyTpl = (tpl: CosmeticTemplate) => {
    const applied = applyTemplate(tpl);
    setCosmeticType(applied.type);
    setBanner(applied.banner);
    setFrame(applied.frame);
    setTitle(applied.title);
    setError(null);
  };

  const uploadAsset = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const res = await fetch(apiUrl("/api/admin/console/cosmetics/upload-asset"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ dataUrl }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? t("adminConsole.cosmeticUploadError"));
      const fullUrl = apiUrl(data.url);
      if (cosmeticType === "BANNER") setBanner((b) => ({ ...b, imageUrl: fullUrl }));
      else if (cosmeticType === "AVATAR_FRAME") setFrame((f) => ({ ...f, imageUrl: fullUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminConsole.cosmeticUploadError"));
    } finally {
      setUploading(false);
    }
  };

  const previewCosmetics = {
    banner:
      cosmeticType === "BANNER"
        ? { id: "preview", gradient: bannerBackgroundPreview(banner), overlayOpacity: banner.overlayOpacity }
        : null,
    frame:
      cosmeticType === "AVATAR_FRAME"
        ? {
            id: "preview",
            border: frame.borderColor,
            glow: frameGlowCss(frame),
            borderWidth: frame.borderWidth,
            imageUrl: frame.imageUrl ?? undefined,
          }
        : null,
    title:
      cosmeticType === "TITLE"
        ? {
            id: "preview",
            nameKey: displayName || t("adminConsole.cosmeticPreviewTitle"),
            color: title.color,
            textShadow: titleShadowCss(title),
            fontWeight: title.fontWeight,
            letterSpacing: `${title.letterSpacing}em`,
          }
        : null,
  };

  const saveCosmetic = async () => {
    const id = cosmeticId.trim() || slugify(displayName);
    if (!id || id.length < 3 || !displayName.trim()) {
      setError(t("adminConsole.cosmeticSaveMissing"));
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = {
        id,
        type: cosmeticType,
        displayName: displayName.trim(),
        rarity: "unique",
      };
      if (cosmeticType === "BANNER") body.bannerStyle = buildBannerPayload(banner);
      if (cosmeticType === "AVATAR_FRAME") body.frameStyle = buildFramePayload(frame);
      if (cosmeticType === "TITLE") body.titleStyle = buildTitlePayload(title);

      if (grantUsername.trim()) {
        const usersRes = await fetch(
          apiUrl(`/api/admin/console/users?q=${encodeURIComponent(grantUsername.trim())}&take=5`),
          { headers: authHeaders() },
        );
        const usersData = (await usersRes.json()) as {
          items?: Array<{ id: string; username: string }>;
        };
        const match = usersData.items?.find(
          (u) => u.username.toLowerCase() === grantUsername.trim().toLowerCase(),
        );
        if (match) body.grantToUserId = match.id;
      }

      const res = await fetch(apiUrl("/api/admin/console/cosmetics"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; cosmetic?: { id: string } };
      if (!res.ok) throw new Error(data.error ?? t("adminConsole.actionError"));
      setSuccess(t("adminConsole.cosmeticSaved", { id: data.cosmetic?.id ?? id }));
      setCosmeticId("");
      setDisplayName("");
      await loadCatalog();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminConsole.actionError"));
    } finally {
      setSaving(false);
    }
  };

  const uniqueItems = catalog.filter((c) => !c.isCatalog);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{t("adminConsole.cosmeticStudioTitle")}</h2>
          <p className="text-sm text-slate-400">{t("adminConsole.cosmeticStudioSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAsset(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white hover:border-amber-400/40"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {t("adminConsole.cosmeticImportAsset")}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {success}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[220px_1fr_280px]">
        {/* Modèles */}
        <aside className={`p-3 ${adminGlassPanelClass}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200/70">
            {t("adminConsole.cosmeticTemplates")}
          </p>
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {COSMETIC_STUDIO_TEMPLATES.filter((tpl) => tpl.type === cosmeticType).map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTpl(tpl)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <Wand2 className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                {t(tpl.labelKey)}
              </button>
            ))}
          </div>
        </aside>

        {/* Canvas / aperçu */}
        <section className={`flex min-h-[360px] flex-col p-4 ${adminGlassPanelClass}`}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("adminConsole.cosmeticPreview")}
          </p>

          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            {cosmeticType === "BANNER" && (
              <CosmeticBannerCard
                cosmetics={previewCosmetics}
                bannerHeightClass="h-36 w-full max-w-md"
                className="w-full max-w-md"
              >
                <div className="flex h-full items-center justify-center p-4">
                  <p className="text-sm font-semibold text-white/90">{t("adminConsole.cosmeticPreviewPlayer")}</p>
                </div>
              </CosmeticBannerCard>
            )}

            {cosmeticType === "AVATAR_FRAME" && (
              <CosmeticAvatar cosmetics={previewCosmetics} sizeClass="h-28 w-28">
                <div
                  className="flex h-full w-full items-center justify-center text-2xl"
                  style={
                    frame.imageUrl
                      ? {
                          backgroundImage: `url("${frame.imageUrl}")`,
                          backgroundSize: "cover",
                        }
                      : undefined
                  }
                >
                  🎴
                </div>
              </CosmeticAvatar>
            )}

            {cosmeticType === "TITLE" && (
              <div className="rounded-xl border border-white/10 bg-slate-950/80 px-8 py-6">
                <CosmeticTitle
                  cosmetics={previewCosmetics}
                  className="text-lg font-bold uppercase tracking-widest"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {(["BANNER", "AVATAR_FRAME", "TITLE"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCosmeticType(type)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  cosmeticType === type
                    ? "bg-amber-600/40 text-amber-100"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </section>

        {/* Outils */}
        <aside className={`space-y-4 p-3 ${adminGlassPanelClass}`}>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-200/70">
            <Palette className="h-3.5 w-3.5" />
            {t("adminConsole.cosmeticTools")}
          </p>

          {cosmeticType === "BANNER" && (
            <div className="space-y-3">
              <ColorRow label={t("adminConsole.cosmeticColorStart")} value={banner.colorStart} onChange={(v) => setBanner((b) => ({ ...b, colorStart: v }))} />
              <ColorRow label={t("adminConsole.cosmeticColorEnd")} value={banner.colorEnd} onChange={(v) => setBanner((b) => ({ ...b, colorEnd: v }))} />
              <SliderRow label={t("adminConsole.cosmeticAngle")} min={0} max={360} value={banner.angle} onChange={(v) => setBanner((b) => ({ ...b, angle: v }))} />
              <SliderRow
                label={t("adminConsole.cosmeticOverlay")}
                min={0}
                max={100}
                value={Math.round(banner.overlayOpacity * 100)}
                onChange={(v) => setBanner((b) => ({ ...b, overlayOpacity: v / 100 }))}
              />
              <label className="block text-xs text-slate-500">{t("adminConsole.cosmeticPattern")}</label>
              <select
                className={adminInputClass}
                value={banner.pattern}
                onChange={(e) =>
                  setBanner((b) => ({ ...b, pattern: e.target.value as BannerEditorState["pattern"] }))
                }
              >
                <option value="none">{t("adminConsole.cosmeticPatternNone")}</option>
                <option value="dots">{t("adminConsole.cosmeticPatternDots")}</option>
                <option value="lines">{t("adminConsole.cosmeticPatternLines")}</option>
                <option value="grid">{t("adminConsole.cosmeticPatternGrid")}</option>
              </select>
              {banner.imageUrl && (
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() => setBanner((b) => ({ ...b, imageUrl: null }))}
                >
                  {t("adminConsole.cosmeticRemoveImage")}
                </button>
              )}
            </div>
          )}

          {cosmeticType === "AVATAR_FRAME" && (
            <div className="space-y-3">
              <ColorRow label={t("adminConsole.cosmeticBorder")} value={frame.borderColor} onChange={(v) => setFrame((f) => ({ ...f, borderColor: v }))} />
              <SliderRow label={t("adminConsole.cosmeticBorderWidth")} min={1} max={10} value={frame.borderWidth} onChange={(v) => setFrame((f) => ({ ...f, borderWidth: v }))} />
              <ColorRow label={t("adminConsole.cosmeticGlow")} value={rgbaToHex(frame.glowColor) ?? "#c9a84c"} onChange={(v) => setFrame((f) => ({ ...f, glowColor: hexToRgba(v, 0.75) }))} />
              <SliderRow label={t("adminConsole.cosmeticGlowBlur")} min={0} max={40} value={frame.glowBlur} onChange={(v) => setFrame((f) => ({ ...f, glowBlur: v }))} />
              {frame.imageUrl && (
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-300"
                  onClick={() => setFrame((f) => ({ ...f, imageUrl: null }))}
                >
                  {t("adminConsole.cosmeticRemoveImage")}
                </button>
              )}
            </div>
          )}

          {cosmeticType === "TITLE" && (
            <div className="space-y-3">
              <ColorRow label={t("adminConsole.cosmeticTitleColor")} value={title.color} onChange={(v) => setTitle((s) => ({ ...s, color: v }))} />
              <SliderRow label={t("adminConsole.cosmeticGlowBlur")} min={0} max={32} value={title.glowBlur} onChange={(v) => setTitle((s) => ({ ...s, glowBlur: v }))} />
              <SliderRow label={t("adminConsole.cosmeticFontWeight")} min={400} max={900} step={100} value={title.fontWeight} onChange={(v) => setTitle((s) => ({ ...s, fontWeight: v }))} />
              <SliderRow label={t("adminConsole.cosmeticLetterSpacing")} min={0} max={30} value={Math.round(title.letterSpacing * 100)} onChange={(v) => setTitle((s) => ({ ...s, letterSpacing: v / 100 }))} />
            </div>
          )}
        </aside>
      </div>

      {/* Publication */}
      <div className={`grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 ${adminGlassPanelClass}`}>
        <input
          className={adminInputClass}
          placeholder={t("adminConsole.cosmeticDisplayName")}
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            if (!cosmeticId) setCosmeticId(slugify(e.target.value));
          }}
        />
        <input
          className={`font-mono text-xs ${adminInputClass}`}
          placeholder={t("adminConsole.playerDetailCosmeticSlug")}
          value={cosmeticId}
          onChange={(e) => setCosmeticId(slugify(e.target.value))}
        />
        <input
          className={adminInputClass}
          placeholder={t("adminConsole.cosmeticGrantUserOptional")}
          value={grantUsername}
          onChange={(e) => setGrantUsername(e.target.value)}
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveCosmetic()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-amber-500 hover:to-orange-500 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("adminConsole.cosmeticPublish")}
        </button>
      </div>

      {/* Bibliothèque unique */}
      <div className={`p-4 ${adminGlassPanelClass}`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-amber-400" />
            {t("adminConsole.cosmeticUniqueLibrary")} ({uniqueItems.length})
          </h3>
          <button type="button" onClick={() => void loadCatalog()} className="text-xs text-slate-400 hover:text-white">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("adminConsole.refresh")}
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {uniqueItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-white/5 bg-slate-950/50 px-3 py-2"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900">
                <ImagePlus className="h-4 w-4 text-amber-300/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.nameKey}</p>
                <p className="font-mono text-[10px] text-slate-500">
                  {item.id} · {item.type}
                </p>
              </div>
              <Download className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
            </div>
          ))}
        </div>
        {uniqueItems.length === 0 && !loading && (
          <p className="py-6 text-center text-sm text-slate-500">{t("adminConsole.cosmeticNoUnique")}</p>
        )}
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-slate-400">
      <span>{label}</span>
      <input
        type="color"
        value={value.startsWith("#") ? value : "#6366f1"}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
      />
    </label>
  );
}

function SliderRow({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
      />
    </label>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function rgbaToHex(rgba: string): string | null {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgba);
  if (!m) return rgba.startsWith("#") ? rgba : null;
  const r = Number(m[1]).toString(16).padStart(2, "0");
  const g = Number(m[2]).toString(16).padStart(2, "0");
  const b = Number(m[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
