'use client';

import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminEditModeProvider } from "@/contexts/AdminEditModeContext";
import { TripBuilderProvider } from "@/contexts/TripBuilderContext";
import { IntelligentDrawerProvider } from "@/features/shared/components/IntelligentDrawerContext";
import { DrawerProvider } from "@/contexts/DrawerContext";
import { ChristmasThemeProvider } from "@/contexts/ChristmasThemeContext";
import { TRPCProvider } from "@/lib/trpc/provider";
import { TooltipProvider } from "@/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import MyStatsig from "@/app/my-statsig";
import PrimeSSRProvider from "@/components/PrimeSSRProvider";

/**
 * Providers component that composes all context providers for the application.
 * Extracted from layout.tsx to reduce nesting depth and improve readability.
 *
 * Provider order matters - dependencies must be wrapped by their dependents:
 * 1. PrimeSSRProvider - SSR support for PrimeReact components
 * 2. MyStatsig - Feature flags (no dependencies)
 * 3. ThemeProvider - Theme management (no dependencies)
 * 4. ChristmasThemeProvider - Seasonal theming (depends on ThemeProvider)
 * 5. TooltipProvider - Tooltip UI (no dependencies)
 * 6. TRPCProvider - tRPC client (no dependencies)
 * 7. AuthProvider - Authentication state (no dependencies)
 * 8. DrawerProvider - Drawer/modal state (no dependencies)
 * 9. AdminEditModeProvider - Admin edit mode (depends on Auth)
 * 10. TripBuilderProvider - Trip planning state (depends on Auth)
 * 11. IntelligentDrawerProvider - AI-powered drawer (depends on Drawer, Auth)
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrimeSSRProvider>
      <MyStatsig>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          storageKey="urban-manual-theme"
        >
          <ChristmasThemeProvider>
            <TooltipProvider>
              <TRPCProvider>
                <AuthProvider>
                  <DrawerProvider>
                    <Suspense fallback={null}>
                      <AdminEditModeProvider>
                        <TripBuilderProvider>
                          <IntelligentDrawerProvider>
                            {children}
                          </IntelligentDrawerProvider>
                        </TripBuilderProvider>
                      </AdminEditModeProvider>
                    </Suspense>
                  </DrawerProvider>
                </AuthProvider>
              </TRPCProvider>
            </TooltipProvider>
          </ChristmasThemeProvider>
        </ThemeProvider>
      </MyStatsig>
    </PrimeSSRProvider>
  );
}
