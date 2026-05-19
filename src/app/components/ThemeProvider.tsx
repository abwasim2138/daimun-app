'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes@0.4.6';
import type { ThemeProviderProps } from 'next-themes@0.4.6';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
