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
  '/auth': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
  '/socket.io': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    ws: true,
  },
};

/** API prod par défaut (Capacitor / Electron sans .env local). */
const CAPACITOR_DEFAULT_API = 'https://api.quantum-bluff.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath = env.VITE_BASE_PATH ?? '/';
  const basePathWithoutTrailingSlash = basePath === '/' ? '' : basePath.replace(/\/$/, '');

  const capacitorEnvDefine =
    mode === 'capacitor'
      ? (() => {
          const api = env.VITE_API_URL?.trim() || CAPACITOR_DEFAULT_API;
          const socket = env.VITE_SOCKET_URL?.trim() || api;
          const socketPath = env.VITE_SOCKET_PATH?.trim() || '/socket.io';
          return {
            'import.meta.env.VITE_API_URL': JSON.stringify(api),
            'import.meta.env.VITE_SOCKET_URL': JSON.stringify(socket),
            'import.meta.env.VITE_SOCKET_PATH': JSON.stringify(socketPath),
          } as Record<string, string>;
        })()
      : {};

  /**
   * Avec `base` non racine, une URL du type `http://localhost:5175/tournaments/id`
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
    includeAssets: [
      'favicon.ico',
      'logo-personnel.webp',
      'logo-512.webp',
      'apple-touch-icon.png',
      'manifest.webmanifest',
      'robots.txt',
      'sitemap.xml',
    ],
    manifest: false,
    workbox: {
      // On garde le code (js/css/html) et les petits assets en précache ;
      // les gros avatars PNG (~2 Mo pièce) sont exclus pour éviter de remplir
      // 76 Mo de cache au premier chargement provoquait des timeouts en cascade sur l’API juste après.
      // Ils seront mis en cache à la volée par le runtime du service worker
      // quand l'utilisateur consultera réellement les pages qui les utilisent.
      globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
      navigateFallback: `${basePath}index.html`,
      // Ne pas renvoyer index.html pour ads.txt (vérification AdSense).
      navigateFallbackDenylist: [/^\/ads\.txt$/],
      mode: 'development',
      // 3 Mo : couvre le bundle JS principal (~2,1 Mo) tout en laissant de
      // côté les gros avatars 2+ Mo (hors globPatterns, chargés à la volée).
      maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      runtimeCaching: [
        {
          // Avatars utilisateur servis par le backend (/api/auth/avatars/:id).
          // StaleWhileRevalidate : sert immédiatement la version en cache et
          // rafraîchit en arrière-plan — l'utilisateur ne voit jamais le
          // spinner deux fois sur le même avatar, même si la personne a
          // changé sa photo entre temps.
          urlPattern: ({ url }) => /\/api\/auth\/avatars\//.test(url.pathname),
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'qb-user-avatars',
            expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Assets statiques d'images (avatars de preset, logos, cartes…)
          // dans /assets/*.{png,jpg,jpeg,webp}. L'URL contient un hash de
          // contenu côté Vite, donc CacheFirst est sûr : le cache est
          // automatiquement invalidé quand l'asset change (= nouveau hash).
          urlPattern: ({ url, request }) =>
            request.destination === 'image' &&
            /\/assets\/.*\.(?:png|jpg|jpeg|webp)$/i.test(url.pathname),
          handler: 'CacheFirst',
          options: {
            cacheName: 'qb-image-assets',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
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
      // Pas de service worker Capacitor / Electron (file://) : évite conflits ou échecs d’enregistrement.
      ...(mode === 'capacitor' || mode === 'electron' ? [] : [pwaPlugin]),
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
