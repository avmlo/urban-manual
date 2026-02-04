import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { ItineraryProvider } from "@/contexts/ItineraryContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { SplashScreen } from "@/components/SplashScreen";
import { TRPCProvider } from "@/lib/trpc/provider";
import { CookieConsent } from "@/components/CookieConsent";
import { ToastContainer } from "@/components/Toast";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipNavigation } from "@/components/SkipNavigation";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "The Urban Manual - Curated Guide to World's Best Hotels, Restaurants & Travel Destinations",
  description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide. Your curated guide to exceptional travel experiences.",
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
        alt: 'The Urban Manual',
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
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="google-adsense-account" content="ca-pub-3052286230434362" />
        {/* Revert iOS-specific app meta to default web behavior */}

        {/* Preconnect hints for faster resource loading */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for additional domains */}
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://guide.michelin.com" />

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
        
        {/* Critical inline CSS for above-the-fold content */}
        {/* Safe: Static CSS from codebase, no user input */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS - Above the fold */
            *,::before,::after{box-sizing:border-box}
            body{margin:0;font-family:system-ui,-apple-system,sans-serif}
            .dark{color-scheme:dark}
          `
        }} />
      </head>
      <body className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
        >
          <SkipNavigation />
          <SplashScreen />
          <TRPCProvider>
            <AuthProvider>
              <ItineraryProvider>
                <Header />
                <main className="min-h-screen page-transition">
                  {children}
                </main>
                <Footer />
                <CookieConsent />
              </ItineraryProvider>
            </AuthProvider>
          </TRPCProvider>
          <ToastContainer />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
