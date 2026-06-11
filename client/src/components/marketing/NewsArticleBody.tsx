import { apiUrl } from "../../utils/apiBase";

export type NewsBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string };

export function parseNewsBlocks(body: string[]): NewsBlock[] {
  const blocks: NewsBlock[] = [];
  for (const block of body) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const img = /^!\[[^\]]*]\((.+)\)$/.exec(trimmed);
    if (img?.[1]) {
      blocks.push({ type: "image", url: img[1] });
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

export function NewsArticleBody({ body }: { body: string[] }) {
  const blocks = parseNewsBlocks(body);
  return (
    <div className="space-y-5">
      {blocks.map((block, i) =>
        block.type === "image" ? (
          <figure key={`img-${i}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <img
              src={resolveImageSrc(block.url)}
              alt=""
              className="max-h-[28rem] w-full object-contain"
              loading="lazy"
            />
          </figure>
        ) : (
          <p key={`p-${i}`} className="text-base leading-relaxed text-slate-300">
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}
