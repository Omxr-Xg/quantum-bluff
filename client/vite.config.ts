/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type PreviewServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/** Même proxy que `server` pour que `vite preview` atteigne l’API sur :3000. */
const devApiProxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        const auth = (req.headers as Record<string, string>).authorization;
        if (auth) proxyReq.setHeader('Authorization', auth);
      });
    },
  },
  '/vmProjetIntegrateurgrp10-0/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/vmProjetIntegrateurgrp10-0/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        const auth = (req.headers as Record<string, string>).authorization;
        if (auth) proxyReq.setHeader('Authorization', auth);
      });
    },
  },
  '/socket.io': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    ws: true,
  },
  '/vmProjetIntegrateurgrp10-0/socket.io': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    ws: true,
    rewrite: (p: string) => p.replace(/^\/vmProjetIntegrateurgrp10-0/, ''),
  },
};

/** Déploiement web public (Capacitor : WebView = pas d’origine /vm… — URL absolue obligatoire si pas de .env). */
const CAPACITOR_DEFAULT_API =
  'https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath =
    env.VITE_BASE_PATH ??
    (mode === 'capacitor' ? '/' : '/vmProjetIntegrateurgrp10-0/');
  const basePathWithoutTrailingSlash = basePath === '/' ? '' : basePath.replace(/\/$/, '');

  const capacitorEnvDefine =
    mode === 'capacitor'
      ? (() => {
          const api = env.VITE_API_URL?.trim() || CAPACITOR_DEFAULT_API;
          const socket = env.VITE_SOCKET_URL?.trim() || api;
          const socketPath =
            env.VITE_SOCKET_PATH?.trim() || '/vmProjetIntegrateurgrp10-0/socket.io';
          return {
            'import.meta.env.VITE_API_URL': JSON.stringify(api),
            'import.meta.env.VITE_SOCKET_URL': JSON.stringify(socket),
            'import.meta.env.VITE_SOCKET_PATH': JSON.stringify(socketPath),
          } as Record<string, string>;
        })()
      : {};

  /**
   * Avec `base` non racine (ex. `/vm…/`), une URL du type `http://localhost:5175/tournaments/id`
   * ne passe pas par Vite : 404. On redirige vers `base + chemin` (GET document / deep links).
   */
  function attachBasePathRedirects(server: ViteDevServer | PreviewServer): void {
    server.middlewares.use((req, res, next) => {
      if (!basePathWithoutTrailingSlash || req.method !== 'GET') {
        next();
        return;
      }
      if ((req.headers.upgrade ?? '').toLowerCase() === 'websocket') {
        next();
        return;
      }
      const url = req.url ?? '';
      const q = url.indexOf('?');
      const pathname = q >= 0 ? url.slice(0, q) : url;
      if (pathname.startsWith(basePathWithoutTrailingSlash)) {
        next();
        return;
      }
      if (
        pathname.startsWith('/@') ||
        pathname.startsWith('/__') ||
        pathname.startsWith('/node_modules') ||
        pathname.startsWith('/src') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/socket.io')
      ) {
        next();
        return;
      }
      if (/\.[a-zA-Z0-9]{1,8}$/.test(pathname)) {
        next();
        return;
      }
      const suffix = pathname === '/' ? '/' : pathname;
      const query = q >= 0 ? url.slice(q) : '';
      const location = `${basePathWithoutTrailingSlash}${suffix === '/' ? '/' : suffix}${query}`;
      res.statusCode = 302;
      res.setHeader('Location', location);
      res.end();
    });

    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      if (
        basePathWithoutTrailingSlash &&
        (url === basePathWithoutTrailingSlash || url.startsWith(`${basePathWithoutTrailingSlash}?`))
      ) {
        res.statusCode = 302;
        res.setHeader('Location', `${basePath}${url.slice(basePathWithoutTrailingSlash.length)}`);
        res.end();
        return;
      }
      next();
    });
  }

  const basePathRedirectPlugin = {
    name: 'base-path-trailing-slash-redirect',
    configureServer(server) {
      attachBasePathRedirects(server);
    },
    configurePreviewServer(server) {
      attachBasePathRedirects(server);
    },
  };

  const pwaPlugin = VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['logo-personnel.png', 'favicon.ico'],
    manifest: {
      name: 'Quantum Bluff',
      short_name: 'Quantum Bluff',
      description: 'Jeu de poker en ligne - Quantum Bluff',
      theme_color: '#0f172a',
      background_color: '#0f172a',
      display: 'standalone',
      scope: basePath,
      start_url: basePath,
      icons: [
        {
          src: `${basePath}logo-personnel.png`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      navigateFallback: `${basePath}index.html`,
      mode: 'development',
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    },
  });

  return {
    base: basePath,
    ...(Object.keys(capacitorEnvDefine).length > 0
      ? { define: capacitorEnvDefine as Record<string, string> }
      : {}),
    plugins: [
      basePathRedirectPlugin,
      react(),
      // Pas de service worker Capacitor (WebView) : évite conflits avec le natif.
      ...(mode === 'capacitor' ? [] : [pwaPlugin]),
    ],
    build: {
      sourcemap: false,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5175,
      proxy: devApiProxy,
    },
    preview: {
      port: 4175,
      proxy: devApiProxy,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov', 'html', 'cobertura'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          '**/*.test.{ts,tsx}',
          '**/__tests__/**',
          '**/*.d.ts',
          '**/*.html',
          '**/*.config.*',
          '**/node_modules/**',
        ],
      },
    },
  };
});
