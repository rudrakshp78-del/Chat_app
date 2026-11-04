import axios from 'axios';
// config
import { BASE_URL } from '../config';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: BASE_URL });

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('token') || window.localStorage.getItem('accessToken')
        : null;

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
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
