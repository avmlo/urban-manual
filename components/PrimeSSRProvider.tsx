'use client';

/**
 * PrimeReact SSR Provider for Next.js App Router
 * Handles server-side style injection for PrimeReact v11 components.
 *
 * UI library choice inspired by itskovacs/trip (PrimeNG/Angular → PrimeReact/React)
 */
import { PrimeReactProvider, PrimeReactStyleSheet } from '@primereact/core';
import { useServerInsertedHTML } from 'next/navigation';
import * as React from 'react';
import Aura from '@primeuix/themes/aura';

const styledStyleSheet = new PrimeReactStyleSheet();

export default function PrimeSSRProvider({ children }: Readonly<{ children?: React.ReactNode }>) {
  useServerInsertedHTML(() => {
    const styleElements = styledStyleSheet.getAllElements();
    styledStyleSheet.clear();
    return <>{styleElements}</>;
  });

  const primereact = {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.dark',
        cssLayer: {
          name: 'primereact',
          order: 'theme, base, primereact, components, utilities',
        },
      },
    },
  };

  return (
    <PrimeReactProvider {...primereact} stylesheet={styledStyleSheet}>
      {children}
    </PrimeReactProvider>
  );
}
