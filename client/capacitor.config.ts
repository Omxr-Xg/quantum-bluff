import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Config Capacitor (Android + iOS).
 *
 * Build web : `npm run build:cap` (mode Vite `capacitor` → `client/.env.capacitor` + repli URL prod dans vite.config).
 * Puis : `npx cap sync` (déjà dans `npm run cap:sync`).
 *
 * Live reload dev : `CAPACITOR_SERVER_URL=http://LAN:5175 npx cap run android`
 */
const config: CapacitorConfig = {
  appId: 'com.quantumbluff.app',
  appName: 'Quantum Bluff',
  webDir: 'dist',
  server: {
    /** Dev uniquement : URL du `vite` sur le réseau local. */
    url: process.env.CAPACITOR_SERVER_URL || undefined,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Quantum Bluff',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
  },
};

export default config;
