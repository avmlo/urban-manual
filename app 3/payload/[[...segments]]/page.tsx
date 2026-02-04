/**
 * Payload Admin Page
 * 
 * Payload's admin UI is automatically rendered by Next.js integration.
 * Authentication is handled by middleware.ts
 * 
 * Route: /payload
 * 
 * Note: This must be a server component (not 'use client') for Payload's
 * Next.js integration to work properly. The withPayload() wrapper handles
 * the actual rendering of the admin UI.
 */
export default function PayloadAdminPage() {
  // Payload's admin UI is automatically rendered by Next.js integration
  // The withPayload() wrapper in next.config.ts handles the routing
  // Authentication is checked in middleware.ts
  // Returning null allows Payload's internal routing to take over
  // The admin UI will be injected by Payload's Next.js integration
  return null
}

