import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shusto.app',

  appName: 'Shusto',

  webDir: 'dist',

  server: {
    // Comment out 'url' for production releases to load local packaged web assets offline-first.
    // When active, the app will try to load this URL from the web. If the site is down or offline, it shows a blank screen.
    // url: 'https://shusto.com',
    cleartext: true
  }
};

export default config;
