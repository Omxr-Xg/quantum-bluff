import { useEffect } from "react";

type PageMeta = {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

const SITE_ORIGIN = "https://www.quantum-bluff.com";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/logo-512.webp`;

export function usePageMeta({ title, description, canonicalPath, ogImage }: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const descEl = document.querySelector('meta[name="description"]');
    const prevDescription = descEl?.getAttribute("content") ?? "";

    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", ogImage ?? DEFAULT_OG_IMAGE);
    if (canonicalPath) {
      upsertMeta("property", "og:url", `${SITE_ORIGIN}${canonicalPath}`);
    }

    return () => {
      document.title = prevTitle;
      if (descEl) {
        descEl.setAttribute("content", prevDescription);
      }
    };
  }, [title, description, canonicalPath, ogImage]);
}
