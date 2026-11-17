import { BASE_URL } from '../config';

// ----------------------------------------------------------------------

export const decodeJwt = (token) => {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload =
      typeof atob === 'function'
        ? decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          )
        : Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const isTokenExpiredOrNear = (token, thresholdSeconds = 60) => {
  if (!token) return true;
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return false;
  const currentTime = Date.now() / 1000;
  return decoded.exp - currentTime < thresholdSeconds;
};

export const isValidToken = (token) => {
  return !isTokenExpiredOrNear(token, 0);
};

export const getSavedToken = () => {
  return typeof window !== 'undefined'
    ? window.localStorage.getItem('token') || window.localStorage.getItem('accessToken')
    : null;
};

let expiredTimer;

export const handleTokenExpired = (exp) => {
  const currentTime = Date.now();
  const timeLeft = exp * 1000 - currentTime;

  clearTimeout(expiredTimer);

  // Trigger background refresh 60 seconds before expiration
  const triggerTime = Math.max(0, timeLeft - 60000);

  expiredTimer = setTimeout(async () => {
    try {
      const currentToken = getSavedToken();
      if (currentToken) {
        const response = await fetch(`${BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentToken }),
        });
        const data = await response.json();
        if (data?.token) {
          setSession(data.token);
        }
      }
    } catch (e) {
      console.warn('Background token refresh in handleTokenExpired failed:', e);
    }
  }, triggerTime);
};

export const setSession = (accessToken) => {
  if (accessToken && typeof window !== 'undefined') {
    window.localStorage.setItem('accessToken', accessToken);
    window.localStorage.setItem('token', accessToken);

    try {
      const decoded = decodeJwt(accessToken);
      if (decoded?.exp) {
        handleTokenExpired(decoded.exp);
      }
    } catch (e) {}
  } else if (typeof window !== 'undefined') {
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('token');
  }
};
