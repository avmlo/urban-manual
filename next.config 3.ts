import type { NextConfig } from "next";
import { withPayload } from '@payloadcms/next/withPayload'

const cspDirectives = [
  "default-src 'self'",
  // Inline scripts are occasionally required for Next.js hydration/runtime.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://cdn.amcharts.com https://*.supabase.co https://*.supabase.in",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://maps.googleapis.com https://api.openai.com https://*.upstash.io https://*.googleapis.com https://api.mapbox.com https://events.mapbox.com",
  "worker-src 'self' blob:",
  "child-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "manifest-src 'self'",
  "media-src 'self' https:",
  "object-src 'none'",
  "prefetch-src 'self'",
  "frame-src 'none'",
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
    value: '*',
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
    value: 'require-corp',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
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

  env: {
    NEXT_PUBLIC_MAPKIT_AVAILABLE:
      process.env.MAPKIT_TEAM_ID && process.env.MAPKIT_KEY_ID && process.env.MAPKIT_PRIVATE_KEY ? 'true' : '',
  },

  // Optimize CSS
  experimental: {
    optimizeCss: true,
  },

  // Optimize production builds (no source maps for smaller bundles)
  productionBrowserSourceMaps: false,

  // Note: Next.js 16 uses SWC (Speedy Web Compiler) by default for:
  // - TypeScript/JavaScript compilation (20x faster than Babel)
  // - Minification (faster than Terser)
  // - Code transformation and optimization
  // SWC is automatically enabled - no configuration needed!
  // 
  // Next.js 16 also uses Turbopack by default which handles chunk splitting automatically
  // Webpack config removed to avoid conflicts with Turbopack

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
        { protocol: 'https', hostname: '*.supabase.in' }
      )
      return patterns
    })(),
  },
};

export default withPayload(nextConfig);
