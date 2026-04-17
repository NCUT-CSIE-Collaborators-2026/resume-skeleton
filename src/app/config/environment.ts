const runtimeApiUrl =
  typeof globalThis !== 'undefined'
    ? (globalThis as { __APP_API_URL?: string }).__APP_API_URL
    : undefined;

const browserOrigin =
  typeof window !== 'undefined' ? window.location.origin : undefined;

export const environment = {
  apiUrl: runtimeApiUrl ?? browserOrigin,
  apiEndpoints: {
    contentI18n: '/api/resume/v0/content.i18n',
    authSession: '/api/resume/v0/auth/session',
    contentCardUpdate: '/api/resume/v0/content.card/update',
  },
};


