
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface NotificationPreferences {
  appointmentReminders: boolean;
  chatAlerts: boolean;
  lowStockAlerts: boolean;
}

interface SettingsContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  notificationPrefs: NotificationPreferences;
  setNotificationPrefs: (prefs: Partial<NotificationPreferences>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
    return localStorage.getItem('theme') as Theme;
  }
  return 'system';
};

const getInitialNotifPrefs = (): NotificationPreferences => {
  const defaults = {
    appointmentReminders: true,
    chatAlerts: true,
    lowStockAlerts: true,
  };
  if (typeof window !== 'undefined' && localStorage.getItem('notificationPrefs')) {
    try {
        const storedPrefs = JSON.parse(localStorage.getItem('notificationPrefs')!);
        return { ...defaults, ...storedPrefs };
    } catch (e) {
        return defaults;
    }
  }
  return defaults;
};


export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [notificationPrefs, setNotificationPrefsState] = useState<NotificationPreferences>({
    appointmentReminders: true,
    chatAlerts: true,
    lowStockAlerts: true,
  });

  useEffect(() => {
    setThemeState(getInitialTheme());
    setNotificationPrefsState(getInitialNotifPrefs());
  }, [])

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let effectiveTheme = theme;
    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        effectiveTheme = systemTheme;
    }

    root.classList.add(effectiveTheme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };
  
  const setNotificationPrefs = (prefs: Partial<NotificationPreferences>) => {
      setNotificationPrefsState(prev => {
          const newPrefs = { ...prev, ...prefs };
          localStorage.setItem('notificationPrefs', JSON.stringify(newPrefs));
          return newPrefs;
      })
  }

  return (
    <SettingsContext.Provider value={{ theme, setTheme, notificationPrefs, setNotificationPrefs }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
