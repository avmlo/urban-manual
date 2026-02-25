import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminEditModeProvider } from "@/contexts/AdminEditModeContext";
import { TripBuilderProvider } from "@/contexts/TripBuilderContext";
import { ResponsiveTripUI } from "@/features/trip/components/builder";
import { IntelligentDrawerProvider } from "@/features/shared/components/IntelligentDrawerContext";
import IntelligentDrawer from "@/features/shared/components/IntelligentDrawer";
import { DrawerProvider } from "@/contexts/DrawerContext";
import { ChristmasThemeProvider } from "@/contexts/ChristmasThemeContext";
import { TRPCProvider } from "@/lib/trpc/provider";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { Toaster } from "@/ui/sonner";
import { TooltipProvider } from "@/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipNavigation } from "@/components/SkipNavigation";
import DrawerMount from "@/features/shared/components/DrawerMount";
import { TripModalMount } from "@/components/TripModalMount";
import { PanelLayout } from "@/components/PanelMount";
import MyStatsig from "./my-statsig";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { WebVitalsTracker } from "@/components/WebVitalsTracker";
import { CookieConsent } from "@/components/CookieConsent";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { NativeExperienceProvider } from "@/components/NativeExperienceProvider";
import { generateOrganizationSchema, generateWebSiteSchema } from "@/lib/metadata";
import PrimeSSRProvider from "@/components/PrimeSSRProvider";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Pinch-to-zoom enabled for accessibility (WCAG 1.4.4)
  // Double-tap zoom and overscroll prevented via CSS (globals.css)
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'),
  title: "The Urban Manual - Curated Guide to World's Best Hotels, Restaurants & Travel Destinations",
  description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide. Your curated guide to exceptional travel experiences.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Urban Manual',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "The Urban Manual - Curated Travel Guide",
    description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide.",
    url: "https://urbanmanual.co",
    siteName: "The Urban Manual",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Urban Manual - Curated guide to world\'s best hotels, restaurants & travel destinations',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "The Urban Manual - Curated Travel Guide",
    description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide.",
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#030712" media="(prefers-color-scheme: dark)" />
        <meta name="google-adsense-account" content="ca-pub-3052286230434362" />
        {/* Smart App Banner - shows "Open in App" banner on iOS Safari */}
        <meta name="apple-itunes-app" content="app-id=6759623668, app-argument=https://www.urbanmanual.co" />

        {/* Preconnect hints for faster resource loading */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Critical fonts - Inter for body text (preloaded for faster LCP) */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          as="style"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Non-critical fonts - loaded after initial render with display=swap for non-blocking */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;700&family=Instrument+Serif:ital@0;1&family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Code font - only needed in admin/code sections */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Gaegu font for Christmas theme */}
        <link
          href="https://fonts.googleapis.com/css2?family=Gaegu:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        
        {/* DNS Prefetch for additional domains */}
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://guide.michelin.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://cdn.amcharts.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* Prefetch common navigation targets for instant page loads */}
        <link rel="prefetch" href="/cities" as="document" />
        <link rel="prefetch" href="/city/tokyo" as="document" />
        <link rel="prefetch" href="/city/london" as="document" />

        {/* RSS Feed */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="The Urban Manual RSS Feed"
          href="https://www.urbanmanual.co/feed.xml"
        />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3052286230434362"
          crossOrigin="anonymous"
        />
        
        {/* Google Analytics - Load script, but only initialize with consent */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              // Set default consent mode to denied - will be updated when user consents
              gtag('consent', 'default', {
                // Behavioral analytics consent signals
                analytics_storage: 'denied',
                // Advertising consent signals
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
              });
            `,
          }}
        />
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-ZLGK6QXD88"
        />
        
        {/* Critical inline CSS for above-the-fold content */}
        {/* Safe: Static CSS from codebase, no user input */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS - Above the fold */
            *,::before,::after{box-sizing:border-box}
            body{margin:0;font-family:'Inter',system-ui,-apple-system,sans-serif}
            .dark{color-scheme:dark}
          `
        }} />
        
        {/* Handle chunk loading errors gracefully */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // Handle chunk loading errors
                window.addEventListener('error', function(e) {
                  if (e.target && e.target.tagName === 'SCRIPT' && e.target.src) {
                    const src = e.target.src;
                    // Check if it's a Next.js chunk
                    if (src.includes('/_next/static/chunks/')) {
                      console.warn('[Chunk Load Error] Failed to load chunk:', src);
                      // Next.js will automatically retry, but we can help by clearing cache
                      // Only do this if the error persists after retries
                      if (e.target.dataset.retryCount && parseInt(e.target.dataset.retryCount) > 2) {
                        console.warn('[Chunk Load Error] Multiple retries failed, consider clearing cache');
                      }
                    }
                  }
                }, true);

                // Handle unhandled promise rejections from chunk loading
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && typeof e.reason === 'object' && e.reason.message) {
                    const message = e.reason.message;
                    if (message.includes('Failed to load chunk') || message.includes('Loading chunk')) {
                      console.warn('[Chunk Load Error]', message);
                      // Next.js handles retries automatically
                      e.preventDefault(); // Prevent default error logging
                    }
                  }
                });
              })();
            `,
          }}
        />

        {/* Schema.org Structured Data for SEO - Site-wide Organization and WebSite schemas */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationSchema()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateWebSiteSchema()),
          }}
        />
      </head>
      <body className="antialiased bg-[var(--editorial-bg)] text-[var(--editorial-text-primary)]">
        <PrimeSSRProvider>
        <MyStatsig>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            storageKey="urban-manual-theme"
          >
            <ChristmasThemeProvider>
            <SkipNavigation />
            <TooltipProvider>
              <TRPCProvider>
                <AuthProvider>
                  <DrawerProvider>
                    <Suspense fallback={null}>
                      <AdminEditModeProvider>
                          <TripBuilderProvider>
                            <IntelligentDrawerProvider>
                              <Header />
                              <NativeExperienceProvider
                                enableSwipeBack={true}
                                disableSwipeBackPaths={['/map', '/chat', '/trip', '/admin', '/studio']}
                              >
                                <PanelLayout>
                                  <main id="main-content" className="min-h-screen page-transition" role="main">
                                    {children}
                                  </main>
                                  <Footer />
                                </PanelLayout>
                              </NativeExperienceProvider>
                              <CookieConsent />
                              <NotificationPrompt />
                              <DrawerMount />
                              <ResponsiveTripUI />
                              <IntelligentDrawer />
                              <TripModalMount />
                            </IntelligentDrawerProvider>
                          </TripBuilderProvider>
                      </AdminEditModeProvider>
                    </Suspense>
                  </DrawerProvider>
                </AuthProvider>
              </TRPCProvider>
            </TooltipProvider>
            <Toaster position="top-right" richColors closeButton />
            <GoogleAnalytics />
            <Analytics />
            <SpeedInsights />
            <WebVitalsTracker />
            </ChristmasThemeProvider>
          </ThemeProvider>
        </MyStatsig>
        </PrimeSSRProvider>
      </body>
    </html>
  );
}
