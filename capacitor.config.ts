import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'org.shusto.app',

  appName: 'Shusto',

  webDir: 'dist',

  server: {
    androidScheme: 'https',
    cleartext: true
  }
};

export default config;
