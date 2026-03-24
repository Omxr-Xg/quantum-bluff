/// <reference types="node" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quantumbluff.app',
  appName: 'Quantum Bluff',
webDir: 'dist',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || undefined,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
