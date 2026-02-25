import { NextResponse } from "next/server";

/**
 * Apple App Site Association (AASA) file for Universal Links.
 * Allows iOS to open urbanmanual.co URLs directly in the native app.
 *
 * Required env var: APPLE_TEAM_ID (your 10-char Apple Developer Team ID)
 */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  const bundleId = "app.rork.urban-manual-co";
  const appId = teamId ? `${teamId}.${bundleId}` : bundleId;

  const association = {
    applinks: {
      details: [
        {
          appIDs: [appId],
          components: [
            // Destination pages
            { "/": "/destination/*", comment: "Destination detail pages" },
            // City pages
            { "/": "/city/*", comment: "City pages" },
            // Trip planning
            { "/": "/trips", comment: "Trips list" },
            { "/": "/trips/*", comment: "Trip details" },
            // Chat
            { "/": "/chat", comment: "AI chat" },
            // Account
            { "/": "/account", comment: "User account" },
            { "/": "/account?*", comment: "Account tabs" },
            // Collections
            { "/": "/collection/*", comment: "Collection pages" },
            // Exclude paths that should stay in the browser
            { "/": "/admin/*", exclude: true, comment: "Admin pages" },
            { "/": "/studio/*", exclude: true, comment: "Studio pages" },
            { "/": "/api/*", exclude: true, comment: "API routes" },
          ],
        },
      ],
    },
    webcredentials: {
      apps: [appId],
    },
  };

  return NextResponse.json(association, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
