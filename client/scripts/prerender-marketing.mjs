#!/usr/bin/env node
/**
 * Post-build prerender for public marketing routes.
 * Writes route-specific index.html so crawlers receive rendered content
 * before the SPA rewrite fallback.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.join(__dirname, "..");
const DIST = path.join(CLIENT_ROOT, "dist");
const SITEMAP = path.join(CLIENT_ROOT, "public", "sitemap.xml");
const PORT = 4175;
const PREVIEW_URL = `http://127.0.0.1:${PORT}`;

async function readRoutesFromSitemap() {
  const xml = await fs.readFile(SITEMAP, "utf8");
  const routes = [...xml.matchAll(/<loc>https:\/\/www\.quantum-bluff\.com([^<]*)<\/loc>/g)].map(
    (m) => m[1] || "/",
  );
  return [...new Set(routes)];
}

function waitForServer(url, timeoutMs = 60_000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(url, { redirect: "follow" });
        if (res.ok || res.status === 304) {
          resolve();
          return;
        }
      } catch {
        /* retry */
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Preview server not ready at ${url}`));
        return;
      }
      setTimeout(tick, 400);
    };
    tick();
  });
}

function routeToOutputFile(route) {
  if (route === "/") return path.join(DIST, "index.html");
  const clean = route.replace(/^\//, "").replace(/\/$/, "");
  return path.join(DIST, clean, "index.html");
}

async function main() {
  const routes = await readRoutesFromSitemap();
  console.log(`[prerender] ${routes.length} routes from sitemap`);

  const preview = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT)], {
    cwd: CLIENT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });

  let previewLog = "";
  preview.stdout?.on("data", (d) => {
    previewLog += d.toString();
  });
  preview.stderr?.on("data", (d) => {
    previewLog += d.toString();
  });

  const killPreview = () => {
    if (!preview.killed) preview.kill("SIGTERM");
  };
  process.on("SIGINT", killPreview);
  process.on("SIGTERM", killPreview);

  try {
    await waitForServer(PREVIEW_URL);
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch (err) {
      console.warn(
        "[prerender] skipped — Chromium unavailable:",
        err instanceof Error ? err.message : err,
      );
      console.warn("[prerender] static SEO HTML from generate-static-seo-html.mjs is used instead.");
      return;
    }
    const context = await browser.newContext({
      serviceWorkers: "block",
      locale: "fr-FR",
    });

    for (const route of routes) {
      const page = await context.newPage();
      const url = `${PREVIEW_URL}${route}`;
      try {
        await page.goto(url, { waitUntil: "load", timeout: 90_000 });
        await page.waitForSelector("h1, h2, article, main", { timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(2000);
        const html = await page.content();
        const out = routeToOutputFile(route);
        await fs.mkdir(path.dirname(out), { recursive: true });
        await fs.writeFile(out, html, "utf8");
        console.log(`[prerender] OK ${route}`);
      } catch (err) {
        console.warn(`[prerender] WARN ${route}:`, err instanceof Error ? err.message : err);
      } finally {
        await page.close();
      }
    }

    await context.close();
    await browser.close();
  } finally {
    killPreview;
    await new Promise((r) => {
      preview.on("exit", r);
      setTimeout(r, 2000);
    });
    if (preview.exitCode === null) {
      console.warn("[prerender] preview log:\n", previewLog.slice(-2000));
    }
  }
}

main().catch((err) => {
  console.error("[prerender] failed:", err);
  process.exit(1);
});
