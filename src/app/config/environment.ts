const runtimeApiUrl =
  typeof globalThis !== 'undefined'
    ? (globalThis as { __APP_API_URL?: string }).__APP_API_URL
    : undefined;

const browserOrigin =
  typeof window !== 'undefined' ? window.location.origin : undefined;

export const environment = {
//   apiUrl: runtimeApiUrl ?? browserOrigin ?? '',
  apiUrl: 'https://resume-api-haolun-wang.9b117201.workers.dev',
  apiEndpoints: {
    contentI18n: '/api/resume/content.i18n',
  },
};
