/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

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
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: true,
    port: 5175,
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
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**']
  }
});