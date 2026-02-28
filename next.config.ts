import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";
import { withSentryConfig } from "@sentry/nextjs";
import withPWAInit from "@ducanh2912/next-pwa";

const cspDirectives = [
  "default-src 'self'",
  // Script sources - unsafe-inline required for inline scripts in layout.tsx
  // (Google Analytics, chunk error handler, JSON-LD schemas)
  // TODO: Migrate to nonce-based CSP for better security
  "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://cdn.amcharts.com https://*.supabase.co https://*.supabase.in https://pagead2.googlesyndication.com https://www.googletagmanager.com https://fundingchoicesmessages.google.com https://ep2.adtrafficquality.google https://vercel.live https://cdn.apple-mapkit.com",
  // More granular control for script elements
  "script-src-elem 'self' 'unsafe-inline' https://maps.googleapis.com https://cdn.amcharts.com https://*.supabase.co https://*.supabase.in https://pagead2.googlesyndication.com https://www.googletagmanager.com https://fundingchoicesmessages.google.com https://ep2.adtrafficquality.google https://vercel.live https://cdn.apple-mapkit.com",
  // Style sources - unsafe-inline kept for Tailwind CSS compatibility
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Restrict image sources to specific trusted domains instead of wildcard
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://guide.michelin.com https://cdn.prod.website-files.com https://framerusercontent.com https://images.unsplash.com https://api.mapbox.com https://maps.googleapis.com https://maps.gstatic.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://maps.googleapis.com https://api.openai.com https://*.upstash.io https://*.googleapis.com https://cdn.jsdelivr.net https://googleads.g.doubleclick.net https://*.doubleclick.net https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://fundingchoicesmessages.google.com https://*.sentry.io https://*.ingest.sentry.io https://*.apple-mapkit.com https://*.ls.apple.com https://*.apple.com https://cdn.apple-mapkit.com https://*.mzstatic.com https://*.geo.apple.com https://*.cdn-apple.com https://featureassets.org https://prodregistryv2.org https://api.open-meteo.com https://geocoding-api.open-meteo.com https://analytics.google.com https://*.google-analytics.com",
  "worker-src 'self' blob:",
  "child-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "manifest-src 'self'",
  "media-src 'self' https:",
  "object-src 'none'",
  "frame-src https://googleads.g.doubleclick.net https://*.doubleclick.net https://tpc.googlesyndication.com https://ep2.adtrafficquality.google https://www.google.com https://vercel.live",
  'upgrade-insecure-requests',
]

const securityHeaders: { key: string; value: string }[] = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
  {
    key: 'Access-Control-Allow-Origin',
    value: process.env.NODE_ENV === 'production' ? 'https://www.urbanmanual.co' : 'http://localhost:3000',
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type, Authorization, X-Requested-With, Accept',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'unsafe-none', // Changed from require-corp to allow external resources
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'cross-origin', // Changed from same-origin to allow external images (e.g., Michelin)
  },
  {
    key: 'Origin-Agent-Cluster',
    value: '?1',
  },
]

const nextConfig: NextConfig = {
  /* config options here */
  // Enable compression
  compress: true,

  // Advanced optimizations for fastest loading
  experimental: {
    // Optimize CSS bundling
    optimizeCss: true,
    // Note: cacheComponents (PPR) disabled - incompatible with route segment configs
    // (dynamic, revalidate, runtime, dynamicParams) and ssr: false dynamic imports
    // We use ISR + Streaming with Suspense instead for similar performance
    // Optimize package imports for smaller bundles
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
      'date-fns',
      'lodash',
    ],
  },

  // Skip static generation for error pages
  // This prevents the _document error during build
  skipTrailingSlashRedirect: true,

  // Optimize production builds (no source maps for smaller bundles)
  productionBrowserSourceMaps: false,

  // Enable React compiler optimizations
  reactStrictMode: true,

  // Note: Next.js 16 uses SWC (Speedy Web Compiler) by default for:
  // - TypeScript/JavaScript compilation (20x faster than Babel)
  // - Minification (faster than Terser)
  // - Code transformation and optimization
  // SWC is automatically enabled - no configuration needed!
  // 
  // Next.js 16 also uses Turbopack by default which handles chunk splitting automatically
  // Webpack config removed to avoid conflicts with Turbopack

  // Consolidate redirect-only routes
  async redirects() {
    return [
      {
        source: '/places/:slug',
        destination: '/destination/:slug',
        permanent: true,
      },
      {
        source: '/profile',
        destination: '/account?tab=preferences',
        permanent: false,
      },
      {
        source: '/collections',
        destination: '/account?tab=collections',
        permanent: false,
      },
      {
        source: '/saved',
        destination: '/account?tab=saved',
        permanent: false,
      },
      {
        source: '/recent',
        destination: '/account?tab=visited',
        permanent: false,
      },
      {
        source: '/itineraries',
        destination: '/trips',
        permanent: true,
      },
      // Legacy Notion route redirect (migrated to /destination)
      {
        source: '/notion/:slug',
        destination: '/destination/:slug',
        permanent: true,
      },
      // iOS legacy icon request
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/apple-touch-icon.png',
        permanent: true,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Cache static assets for 1 year
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache destinations.json for 5 minutes with stale-while-revalidate
        source: '/destinations.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // Cache for 7 days (604800 seconds)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false, // Ensure image optimization is enabled
    remotePatterns: (() => {
      const patterns: { protocol: 'https'; hostname: string }[] = []
      try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const { hostname } = new URL(supabaseUrl)
          patterns.push({ protocol: 'https', hostname })
        }
      } catch {}
      // Add common image CDN domains
      patterns.push(
        { protocol: 'https', hostname: 'guide.michelin.com' },
        // Legacy: Framer/Webflow patterns kept for backwards compatibility
        // All images have been migrated to Supabase Storage
        { protocol: 'https', hostname: 'cdn.prod.website-files.com' },
        { protocol: 'https', hostname: 'framerusercontent.com' },
        { protocol: 'https', hostname: '*.framerusercontent.com' },
        { protocol: 'https', hostname: '*.webflow.com' },
        // Supabase Storage (primary image hosting)
        { protocol: 'https', hostname: '*.supabase.co' },
        { protocol: 'https', hostname: '*.supabase.in' },
        // Vercel Blob storage
        { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
        // Common travel image sources
        { protocol: 'https', hostname: 'images.unsplash.com' },
        // Mapbox static maps
        { protocol: 'https', hostname: 'api.mapbox.com' }
      )
      return patterns
    })(),
  },
};

// Configure PWA
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  // Fallback to offline page when network fails
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Customize runtime caching for travel app assets
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|png|gif|webp|avif|svg|ico)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "static-images",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "supabase-images",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
    ],
  },
});

// Wrap the Next.js config with PWA, Payload, and Sentry
const pwaConfig = withPWA(nextConfig);

const sentryConfig = withSentryConfig(pwaConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "the-manual-company",
  project: "sentry-red-park",
});

export default withPayload(sentryConfig);
