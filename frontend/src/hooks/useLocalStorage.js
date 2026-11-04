import { useState, useEffect } from 'react';

// ----------------------------------------------------------------------

export default function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue === null) return defaultValue;
      const parsed = JSON.parse(storedValue);
      if (
        defaultValue &&
        typeof defaultValue === 'object' &&
        !Array.isArray(defaultValue) &&
        parsed &&
        typeof parsed === 'object'
      ) {
        return { ...defaultValue, ...parsed };
      }
      return parsed;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const listener = (e) => {
      if (e.storageArea === localStorage && e.key === key) {
        try {
          setValue(e.newValue ? JSON.parse(e.newValue) : defaultValue);
        } catch {
          setValue(defaultValue);
        }
      }
    };
    window.addEventListener('storage', listener);

    return () => {
      window.removeEventListener('storage', listener);
    };
  }, [key, defaultValue]);

  const setValueInLocalStorage = (newValue) => {
    setValue((currentValue) => {
      const result = typeof newValue === 'function' ? newValue(currentValue) : newValue;

      localStorage.setItem(key, JSON.stringify(result));

      return result;
    });
  };

  return [value, setValueInLocalStorage];
}
