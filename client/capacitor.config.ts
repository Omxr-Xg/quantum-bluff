import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Config Capacitor (Android + iOS).
 *
 * Build web dédié : `npm run build:cap` (charge `.env.capacitor` via Vite `--mode capacitor`).
 * Live reload dev : `CAPACITOR_SERVER_URL=http://LAN:5175 npx cap run android` (voir package.json).
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
