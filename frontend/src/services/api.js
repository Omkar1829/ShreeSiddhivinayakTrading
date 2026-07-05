import axios from 'axios';
import store from '../store';
import { clearCredentials, setCredentials } from '../store/authSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://54.234.20.250:5000';
// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Manage Access Token Expirations & Renewals
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Trigger token refresh if 401 occurs and has not already been retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        store.dispatch(clearCredentials());
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/api/auth/token/refresh`, { refreshToken });
        if (res.data.success) {
          const newAccessToken = res.data.accessToken;
          const user = JSON.parse(localStorage.getItem('user'));

          store.dispatch(
            setCredentials({
              accessToken: newAccessToken,
              refreshToken,
              user
            })
          );

          isRefreshing = false;
          processQueue(null, newAccessToken);

          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(clearCredentials());
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    // Format server error payloads to throw cleaner error formats in components
    const errorPayload = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: 'Failed to connect to the server. Please check your internet connection.'
    };
    return Promise.reject(errorPayload);
  }
);

export default api;
