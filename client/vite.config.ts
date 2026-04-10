/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath =
    env.VITE_BASE_PATH ??
    (mode === 'capacitor' ? '/' : '/vmProjetIntegrateurgrp10-0/');

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
    },
  });

  return {
    base: basePath,
    plugins: [
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
