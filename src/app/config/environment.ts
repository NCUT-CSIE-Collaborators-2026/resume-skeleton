const runtimeApiUrl =
  typeof globalThis !== 'undefined'
    ? (globalThis as { __APP_API_URL?: string }).__APP_API_URL
    : undefined;

const browserOrigin =
  typeof window !== 'undefined' ? window.location.origin : undefined;

export const environment = {
  apiUrl: runtimeApiUrl ?? browserOrigin,
  apiBasePath: '/api/resume/v0',
  apiEndpoints: {
    contentI18n: '/content.i18n',
    authSession: '/auth/session',
    authLogout: '/auth/logout',
    authGoogleLogin: '/auth/google/login',
    contentCardUpdate: '/content.card/update',
  },
};