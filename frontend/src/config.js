// API Configuration
// Production Backend: https://api.shreesiddhivinayaktrading.in
// Local Development:  http://localhost:5050

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5050';
    }
  }

  return 'https://api.shreesiddhivinayaktrading.in';
};

export const API_BASE_URL = getApiBaseUrl();
