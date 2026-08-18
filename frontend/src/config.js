// Smart API Base URL Resolution
// 1. Uses VITE_API_BASE_URL if explicitly set in environment / .env
// 2. Automatically resolves to host protocol & hostname in production (e.g., http://your-domain-or-ip:5050)
// 3. Fallback to http://localhost:5050 in local development

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5050';
    }
    // Production/Hosted Server: target hosted hostname on port 5050
    return `${protocol}//${hostname}:5050`;
  }

  return 'http://localhost:5050';
};

export const API_BASE_URL = getApiBaseUrl();
