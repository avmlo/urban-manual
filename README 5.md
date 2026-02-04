# The Urban Manual

A modern, curated travel guide featuring 897 destinations across the world.

> **⚠️ IMPORTANT**: The production Next.js 16 app now lives at the **repository root**. All commands in this README assume you are already in `/workspace/urban-manual` (or wherever you cloned the repo).

Need to work on the tagging/enrichment system? Read the [Semantic Tags Guide](docs/semantic_tags.md) for rule syntax, testing steps, and taxonomy tips.

## Active Development (Next.js 16)

**Location**: Repository root (`/`)

### Features

- 🌍 **897 Curated Destinations** - Handpicked places across major cities worldwide
- 🗺️ **Interactive Map** - Visualize countries you've visited
- ⭐ **Michelin-Starred Restaurants** - Discover award-winning dining experiences
- 👤 **User Accounts** - Track visited places, save favorites, and build your travel profile
- 📱 **Responsive Design** - Beautiful on desktop and mobile
- 🎨 **Urban Manual Inspired** - Clean, minimal, editorial design
- 🌙 **Dark Mode** - Full dark mode support

### Tech Stack (Next.js)

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with direct client integration
- **Authentication**: Supabase Auth with Google OAuth
- **Deployment**: Vercel

## Environment Variables

Create a `.env.local` file in the repository root:

```env
# Required for Supabase auth + client access
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required for enrichment scripts / admin tasks
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Gemini / Google features (AI chat, contextual search, maps)
GEMINI_API_KEY=your_gemini_or_google_api_key
GOOGLE_API_KEY=your_google_api_key # falls back to NEXT_PUBLIC_GOOGLE_API_KEY
NEXT_PUBLIC_GOOGLE_API_KEY=your_browser_safe_google_key

# Optional client features
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
NEXT_PUBLIC_MAPKIT_JS_KEY=your_apple_mapkit_key
NEXT_PUBLIC_MAPKIT_TEAM_ID=your_apple_team_id
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BUILD_VERSION=dev
```

Next.js requires the `NEXT_PUBLIC_` prefix for any variable that must be available in the browser. The Supabase/Google scripts also read the unprefixed counterparts (`SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`, etc.), so the safest path is to define both when possible.

## Local Development

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Run linting / unit tests
npm run lint
npm run test:unit

# Build and start production server
npm run build
npm start
```

## Deployment to Vercel

### Prerequisites
- Vercel account (sign up at https://vercel.com)
- GitHub account
- This repository pushed to GitHub

### Steps

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/travel-guide.git
   git push -u origin master
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your `travel-guide` repository
   - Vercel will auto-detect the settings
   - Add environment variables in the Vercel dashboard
   - Click "Deploy"

3. **Configure Environment Variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env` file
   - Make sure to add them for Production, Preview, and Development

4. **Update Supabase URLs**
   - After deployment, get your Vercel URL
   - Add it to Supabase Authentication → URL Configuration
   - Site URL: `https://your-project.vercel.app`
   - Redirect URLs: `https://your-project.vercel.app/**`

## Legacy Note

Earlier iterations of Urban Manual used a Vite client that lived in `/client`. That codebase is fully deprecated—the folder no longer exists, and all current work should target the root-level Next.js 16 project described above. The history is useful if you are spelunking older migrations, but ignore any residual references to `/client` or `urban-manual-next/` in older documents.

## Database Setup

The project uses Supabase with the following tables:

### `destinations`
- Stores all travel destinations
- Fields: name, slug, city, category, description, image, michelin_stars, crown

### `visited_places`
- Tracks user's visited destinations
- Fields: user_id, destination_id, visited_date, rating, notes

### SQL Setup
Run these SQL commands in Supabase SQL Editor:

```sql
-- See setup_supabase.js for full schema
```

## Features Overview

### Home Page
- Browse 897 destinations
- Filter by city (pill-style buttons with counts)
- Search functionality
- Slideover drawer for destination details

### AI Assistant
- Natural language travel queries
- Recommendations from curated database only
- Itinerary generation
- Personalized greetings when logged in

### Account Page
- Travel statistics (places visited, cities explored, countries)
- Visited places grid with images and details
- Interactive world map showing visited countries
- Profile management

### Destination Details
- Large hero images
- Michelin star ratings
- One-click "Mark as Visited"
- Optional visit details (date, rating, notes)
- Save for later functionality

## Design Philosophy

Inspired by Urban Manual and Little Places London:
- Minimal, monochromatic color scheme
- Bold typography
- Large, beautiful imagery
- Story-led content
- Clean, editorial layout

## License

MIT

## Credits

Built with ❤️ using modern web technologies

