import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/vmProjetIntegrateurgrp10-0/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
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
        rewrite: (path) => path.replace(/^\/vmProjetIntegrateurgrp10-0/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const auth = (req.headers as Record<string, string>).authorization;
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
        },
      },
    },
  },
})