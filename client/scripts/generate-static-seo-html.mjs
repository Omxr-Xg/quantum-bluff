#!/usr/bin/env node
/**
 * Playwright-free SEO HTML: one index.html per public route with meta + visible text.
 * Runs on every production build (Vercel-safe).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.join(__dirname, "..");
const DIST = path.join(CLIENT_ROOT, "dist");
const MANIFEST = path.join(CLIENT_ROOT, "scripts", "seo-manifest.json");
const SITEMAP = path.join(CLIENT_ROOT, "public", "sitemap.xml");

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function routeToOutputFile(route) {
  if (route === "/") return path.join(DIST, "index.html");
  const clean = route.replace(/^\//, "").replace(/\/$/, "");
  return path.join(DIST, clean, "index.html");
}

function upsertMeta(html, attr, key, content) {
  const re = new RegExp(`<meta ${attr}="${key}"[^>]*>`, "i");
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function upsertCanonical(html, href) {
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`;
  if (/<link rel="canonical"/i.test(html)) {
    return html.replace(/<link rel="canonical"[^>]*>/i, tag);
  }
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function buildSeoBlock(route, meta, origin) {
  const paras = (meta.paragraphs ?? [meta.description])
    .map((p) => `<p style="margin:0 0 1rem;line-height:1.6">${escapeHtml(p)}</p>`)
    .join("");
  return `
    <div id="seo-static-fallback" style="max-width:48rem;margin:0 auto;padding:1.5rem;font-family:system-ui,sans-serif;color:#cbd5e1;background:#020716">
      <header style="margin-bottom:1.5rem;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:1rem">
        <p style="margin:0 0 .5rem;font-size:.65rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#67e8f9">Quantum Bluff</p>
        <h1 style="margin:0;font-size:1.75rem;font-weight:800;color:#fff">${escapeHtml(meta.heading ?? meta.title)}</h1>
      </header>
      ${paras}
      <nav style="margin-top:1.5rem;font-size:.875rem">
        <a href="${origin}/discover" style="color:#67e8f9;margin-right:1rem">Découvrir</a>
        <a href="${origin}/news" style="color:#67e8f9;margin-right:1rem">Actualités</a>
        <a href="${origin}/auth" style="color:#67e8f9">Jouer gratuitement</a>
      </nav>
    </div>`;
}

function patchHtml(template, route, meta, origin) {
  const canonical = `${origin}${route === "/" ? "/" : route}`;
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  html = upsertMeta(html, "name", "description", meta.description);
  html = upsertMeta(html, "name", "robots", "index, follow, max-image-preview:large");
  html = upsertMeta(html, "property", "og:title", meta.title);
  html = upsertMeta(html, "property", "og:description", meta.description);
  html = upsertMeta(html, "property", "og:url", canonical);
  html = upsertMeta(html, "property", "og:type", "article");
  html = upsertCanonical(html, canonical);

  const block = buildSeoBlock(route, meta, origin);
  if (html.includes('id="seo-static-fallback"')) {
    html = html.replace(/<div id="seo-static-fallback"[\s\S]*?<\/div>\s*(?=<\/div>\s*<script)/, block);
  } else if (html.includes('id="root"')) {
    html = html.replace(/<div id="root">/, `<div id="root">${block}`);
  } else {
    html = html.replace("<body>", `<body>${block}`);
  }
  return html;
}

async function readRoutesFromSitemap() {
  const xml = await fs.readFile(SITEMAP, "utf8");
  return [...xml.matchAll(/<loc>https:\/\/www\.quantum-bluff\.com([^<]*)<\/loc>/g)].map(
    (m) => m[1] || "/",
  );
}

async function main() {
  const [template, manifestRaw] = await Promise.all([
    fs.readFile(path.join(DIST, "index.html"), "utf8"),
    fs.readFile(MANIFEST, "utf8"),
  ]);
  const manifest = JSON.parse(manifestRaw);
  const routes = await readRoutesFromSitemap();
  let written = 0;
  let missing = 0;

  for (const route of routes) {
    const meta = manifest.routes[route];
    if (!meta) {
      console.warn(`[static-seo] no manifest for ${route}`);
      missing += 1;
      continue;
    }
    const html = patchHtml(template, route, meta, manifest.siteOrigin);
    const out = routeToOutputFile(route);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, html, "utf8");
    written += 1;
  }

  console.log(`[static-seo] wrote ${written} HTML files (${missing} missing meta)`);
  if (written === 0) process.exit(1);
}

main().catch((err) => {
  console.error("[static-seo] failed:", err);
  process.exit(1);
});
