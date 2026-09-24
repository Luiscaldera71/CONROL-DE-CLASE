import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aulacontrol.app',
  appName: 'AulaControl',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
