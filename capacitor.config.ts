import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eduvo.rewards',
  appName: 'Eduvo Rewards',
  webDir: 'www',
  plugins: {
    SystemBars: {
      // MainActivity reserves native system-bar space, including keyboard insets.
      insetsHandling: 'disable',
      style: 'DARK'
    }
  },
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
