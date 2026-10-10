export const environment = {
  production: true,
  // Replace this with the deployed HTTPS backend before producing a store build.
  apiBaseUrl: 'http://localhost:3000',
  // USB-connected Android testing uses `adb reverse tcp:3000 tcp:3000`.
  nativeApiBaseUrl: 'http://localhost:3000',
  appVersion: '1.0.0'
};
