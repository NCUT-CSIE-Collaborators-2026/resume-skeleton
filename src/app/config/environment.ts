const runtimeApiUrl =
  typeof globalThis !== 'undefined'
    ? (globalThis as { __APP_API_URL?: string }).__APP_API_URL
    : undefined;

const browserOrigin =
  typeof window !== 'undefined' ? window.location.origin : undefined;

const browserHostname =
  typeof window !== 'undefined' ? window.location.hostname : undefined;

const defaultCloudApiUrl = 'https://resume-api-haolun-wang.9b117201.workers.dev';

const resolvedApiUrl =
  runtimeApiUrl ??
  (browserHostname?.endsWith('.pages.dev') ? defaultCloudApiUrl : browserOrigin);

export const environment = {
  apiUrl: resolvedApiUrl,
  apiBasePath: '/api/resume/v0',
  apiEndpoints: {
    contentI18n: '/content.i18n',
    authSession: '/auth/session',
    authLogout: '/auth/logout',
    authGoogleLogin: '/auth/google/login',
    contentCardUpdate: '/content.card/update',
  },
};