
"use client";

import React from 'react';
import { AuthProvider } from '@/context/AuthContext'; 

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
