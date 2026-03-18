/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const basePath = process.env.VITE_BASE_PATH ?? '/vmProjetIntegrateurgrp10-0/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
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
      },
    }),
  ],
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: proxy => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = (req.headers as Record<string, string>).authorization;
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
        }
      },
      '/vmProjetIntegrateurgrp10-0/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/vmProjetIntegrateurgrp10-0/, ''),
        configure: proxy => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = (req.headers as Record<string, string>).authorization;
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
        }
      },
      // WebSocket proxy pour Socket.IO (évite ws://localhost:5173 quand le socket se connecte à l'origine)
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      },
      '/vmProjetIntegrateurgrp10-0/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        rewrite: path => path.replace(/^\/vmProjetIntegrateurgrp10-0/, '')
      }
    }
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        },
        setupFiles: ['.storybook/vitest.setup.ts']
      }
    }]
  }
});