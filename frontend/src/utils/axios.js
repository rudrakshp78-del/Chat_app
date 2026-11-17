import axios from 'axios';
import { BASE_URL } from '../config';
import { isTokenExpiredOrNear, getSavedToken } from './jwt';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: BASE_URL });

let isRefreshing = false;
let refreshPromise = null;
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

/**
 * Thread-safe single-flight token refresh mutex.
 * If multiple requests trigger refresh concurrently, only 1 HTTP request is sent.
 */
export const refreshTokenNow = async () => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = new Promise(async (resolve, reject) => {
    try {
      const storedToken = getSavedToken();

      if (!storedToken) {
        isRefreshing = false;
        refreshPromise = null;
        return reject(new Error('No token found to refresh'));
      }

      const res = await axios.post(
        `${BASE_URL}/auth/refresh-token`,
        { token: storedToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res.data?.token) {
        const freshToken = res.data.token;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('token', freshToken);
          window.localStorage.setItem('accessToken', freshToken);
        }
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${freshToken}`;

        try {
          // Notify active socket connection of the fresh token
          const { updateSocketToken } = await import('../socket');
          updateSocketToken(freshToken);
        } catch (e) {}

        processQueue(null, freshToken);
        resolve(freshToken);
      } else {
        const err = new Error('Invalid refresh response from server');
        processQueue(err, null);
        reject(err);
      }
    } catch (err) {
      processQueue(err, null);
      reject(err);
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  });

  return refreshPromise;
};

// Request interceptor: proactively ensure valid token and refresh if near expiry (<60s)
axiosInstance.interceptors.request.use(
  async (config) => {
    // Avoid recursion on public authentication routes
    if (
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/verify') ||
      config.url?.includes('/auth/resend-otp') ||
      config.url?.includes('/auth/forgot-password') ||
      config.url?.includes('/auth/reset-password') ||
      config.url?.includes('/auth/social-login') ||
      config.url?.includes('/auth/refresh-token')
    ) {
      return config;
    }

    let token = getSavedToken();

    if (token) {
      if (isTokenExpiredOrNear(token, 60)) {
        try {
          const freshToken = await refreshTokenNow();
          if (freshToken) {
            token = freshToken;
          }
        } catch (e) {
          console.warn('Pre-request token refresh warning:', e?.message || e);
        }
      }

      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: capture x-new-token and handle 401 / expired token retries
axiosInstance.interceptors.response.use(
  (response) => {
    const newToken =
      response.headers &&
      (response.headers['x-new-token'] ||
        response.headers['X-New-Token'] ||
        response.headers['x-new-token'.toLowerCase()]);

    if (newToken && typeof window !== 'undefined') {
      window.localStorage.setItem('token', newToken);
      window.localStorage.setItem('accessToken', newToken);
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      import('../socket').then(({ updateSocketToken }) => {
        updateSocketToken(newToken);
      }).catch(() => {});
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const errorMsg =
      error.response?.data?.message ||
      error.message ||
      (typeof error.response?.data === 'string' ? error.response.data : '');

    const isTokenExpired =
      error.response &&
      (error.response.status === 401 || error.response.status === 500) &&
      (errorMsg === 'jwt expired' ||
        (typeof errorMsg === 'string' &&
          (errorMsg.toLowerCase().includes('jwt expired') ||
            errorMsg.toLowerCase().includes('token expired'))));

    if (isTokenExpired && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      try {
        const freshToken = await refreshTokenNow();
        if (freshToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshErr) {
        console.warn('Silent refresh token in response interceptor failed:', refreshErr);
      }
    }

    let errorData =
      (error.response && error.response.data) ||
      error.message ||
      'Something went wrong';

    if (
      typeof errorData === 'string' &&
      (errorData.includes('<!DOCTYPE') || errorData.includes('<html'))
    ) {
      errorData = {
        status: 'error',
        message:
          'Backend server is updating or encountered an error. Please try again in a few moments.',
      };
    }

    return Promise.reject(errorData);
  }
);

export default axiosInstance;
