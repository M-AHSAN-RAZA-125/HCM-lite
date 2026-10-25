const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') || '';

export function apiUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/api/')) {
    throw new Error('API requests must use an absolute /api path.');
  }

  if (!configuredApiBaseUrl) return path;

  let apiOrigin;
  try {
    apiOrigin = new URL(configuredApiBaseUrl);
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) API origin.');
  }
  if (!['http:', 'https:'].includes(apiOrigin.protocol)) {
    throw new Error('VITE_API_BASE_URL must use HTTP or HTTPS.');
  }
  if (apiOrigin.pathname !== '/' || apiOrigin.search || apiOrigin.hash) {
    throw new Error('VITE_API_BASE_URL must be an API origin without a path, query, or fragment.');
  }
  if (
    import.meta.env.PROD &&
    (apiOrigin.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(apiOrigin.hostname))
  ) {
    throw new Error('Production VITE_API_BASE_URL must use a public HTTPS API host.');
  }

  return new URL(path, apiOrigin).toString();
}
