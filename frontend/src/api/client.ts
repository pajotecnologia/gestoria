const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return path.startsWith('/') ? API_BASE_URL + path : API_BASE_URL + '/' + path;
}
