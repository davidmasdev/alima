import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import {
  AppColors,
  darkColors,
  EffectiveTheme,
  lightColors,
  ThemeMode,
} from '@/constants/Colors';

const THEME_MODE_KEY = 'alima_theme_mode';

interface ThemeContextValue {
  colors: AppColors;
  effectiveTheme: EffectiveTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

async function getStoredThemeMode(): Promise<ThemeMode | null> {
  const webStorage = getWebStorage();
  const value = webStorage
    ? webStorage.getItem(THEME_MODE_KEY)
    : await SecureStore.getItemAsync(THEME_MODE_KEY);

  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }

  return null;
}

async function saveThemeMode(mode: ThemeMode): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(THEME_MODE_KEY, mode);
    return;
  }

  await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getStoredThemeMode()
      .then((storedMode) => {
        if (isMounted && storedMode) {
          setModeState(storedMode);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveTheme: EffectiveTheme = mode === 'system'
    ? systemScheme === 'dark' ? 'dark' : 'light'
    : mode;
  const colors = effectiveTheme === 'dark' ? darkColors : lightColors;

  const setMode = async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await saveThemeMode(nextMode);
  };

  const value = useMemo(
    () => ({ colors, effectiveTheme, mode, setMode }),
    [colors, effectiveTheme, mode],
  );

  if (!isLoaded) {
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }

  return value;
}
