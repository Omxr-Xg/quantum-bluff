import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "../../utils/apiBase";

export type NewsBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; url: string }
  | { type: "hr" };

const IMAGE_MD_RE = /^!\[[^\]]*]\((.+)\)$/;

export function extractNewsImageUrls(body: string[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const block of body) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const img = IMAGE_MD_RE.exec(trimmed);
    if (img?.[1] && !seen.has(img[1])) {
      seen.add(img[1]);
      urls.push(img[1]);
      continue;
    }
    const re = /!\[[^\]]*]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(trimmed)) !== null) {
      if (m[1] && !seen.has(m[1])) {
        seen.add(m[1]);
        urls.push(m[1]);
      }
    }
  }
  return urls;
}

export function parseNewsBlocks(body: string[]): NewsBlock[] {
  const blocks: NewsBlock[] = [];
  for (const block of body) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const img = IMAGE_MD_RE.exec(trimmed);
    if (img?.[1] && trimmed === img[0]) {
      blocks.push({ type: "image", url: img[1] });
      continue;
    }

    if (trimmed === "---" || trimmed === "***" || trimmed === "—") {
      blocks.push({ type: "hr" });
      continue;
    }

    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1) {
      if (lines[0].startsWith("### ")) {
        blocks.push({ type: "heading", level: 3, text: lines[0].slice(4) });
        continue;
      }
      if (lines[0].startsWith("## ")) {
        blocks.push({ type: "heading", level: 2, text: lines[0].slice(3) });
        continue;
      }
      if (lines[0].startsWith("# ")) {
        blocks.push({ type: "heading", level: 1, text: lines[0].slice(2) });
        continue;
      }
      blocks.push({ type: "paragraph", text: trimmed });
      continue;
    }

    if (lines.every((l) => /^[-*•]\s+/.test(l))) {
      blocks.push({
        type: "list",
        items: lines.map((l) => l.replace(/^[-*•]\s+/, "")),
      });
      continue;
    }

    blocks.push({ type: "paragraph", text: trimmed });
  }
  return blocks;
}

function resolveImageSrc(url: string): string {
  if (url.startsWith("/api/")) return apiUrl(url);
  return url;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\([^)]+\))/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const token = m[0];
    const k = `${keyPrefix}-${i++}`;
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={k} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      nodes.push(
        <em key={k} className="italic text-slate-200">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      const link = /^\[([^\]]+)]\(([^)]+)\)$/.exec(token);
      if (link) {
        const href = link[2]!;
        const external = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            key={k}
            href={href}
            className="text-cyan-300 underline decoration-cyan-500/50 underline-offset-2 hover:text-cyan-100"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length > 0 ? nodes : [text];
}

function NewsImageFigure({ url }: { url: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <img
        src={resolveImageSrc(url)}
        alt=""
        className="max-h-[28rem] w-full object-contain"
        loading="lazy"
      />
    </figure>
  );
}

export function NewsImageGallery({ urls, title }: { urls: string[]; title?: boolean }) {
  const { t } = useTranslation();
  if (urls.length === 0) return null;
  return (
    <section className="mt-10 border-t border-white/10 pt-8">
      {title ? (
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">
          {t("publicSite.newsGallery")}
        </h2>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {urls.map((url) => (
          <NewsImageFigure key={url} url={url} />
        ))}
      </div>
    </section>
  );
}

export function NewsArticleBody({
  body,
  showBottomGallery = true,
}: {
  body: string[];
  showBottomGallery?: boolean;
}) {
  const blocks = parseNewsBlocks(body);
  const galleryUrls = extractNewsImageUrls(body);

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if (block.type === "image") {
          return null;
        }
        if (block.type === "hr") {
          return <hr key={`hr-${i}`} className="border-white/10" />;
        }
        if (block.type === "heading") {
          const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          const size =
            block.level === 1
              ? "text-2xl font-bold text-white"
              : block.level === 2
                ? "text-xl font-semibold text-white"
                : "text-lg font-semibold text-slate-100";
          return (
            <Tag key={`h-${i}`} className={size}>
              {renderInline(block.text, `h-${i}`)}
            </Tag>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={`ul-${i}`} className="list-disc space-y-2 pl-6 text-base leading-relaxed text-slate-300">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item, `li-${i}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${i}`} className="whitespace-pre-wrap text-base leading-relaxed text-slate-300">
            {renderInline(block.text, `p-${i}`)}
          </p>
        );
      })}
      {showBottomGallery && galleryUrls.length > 0 ? (
        <NewsImageGallery urls={galleryUrls} title />
      ) : null}
    </div>
  );
}
