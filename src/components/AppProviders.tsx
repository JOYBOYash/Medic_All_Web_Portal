
"use client";

import React from 'react';
import { AuthProvider } from '@/context/AuthContext'; 
import { SettingsProvider } from '@/context/SettingsContext';

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </AuthProvider>
  );
}
