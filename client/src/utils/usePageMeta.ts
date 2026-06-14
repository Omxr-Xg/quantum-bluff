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

function upsertCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function usePageMeta({ title, description, canonicalPath, ogImage }: PageMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const descEl = document.querySelector('meta[name="description"]');
    const prevDescription = descEl?.getAttribute("content") ?? "";

    const canonicalEl = document.querySelector('link[rel="canonical"]');
    const prevCanonical = canonicalEl?.getAttribute("href") ?? "";

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", "index, follow, max-image-preview:large");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", ogImage ?? DEFAULT_OG_IMAGE);
    upsertMeta("property", "og:type", "website");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage ?? DEFAULT_OG_IMAGE);
    if (canonicalPath) {
      const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
      upsertMeta("property", "og:url", canonicalUrl);
      upsertCanonical(canonicalUrl);
    }

    return () => {
      document.title = prevTitle;
      if (descEl) {
        descEl.setAttribute("content", prevDescription);
      }
      if (canonicalEl) {
        if (prevCanonical) canonicalEl.setAttribute("href", prevCanonical);
        else canonicalEl.remove();
      }
    };
  }, [title, description, canonicalPath, ogImage]);
}
