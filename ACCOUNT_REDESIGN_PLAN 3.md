# Complete Account Page Redesign & Feature Expansion
## The Urban Manual - Account System Overhaul

**Created:** Nov 4, 2025
**Status:** Ready for implementation

---

## 🎯 Goals

1. **Modern, Instagram-like account experience**
2. **Rich travel profile** with stats, achievements, maps
3. **Better organization** of saved/visited/collections
4. **Itinerary builder** with AI suggestions
5. **World map visualization** (actual interactive map)
6. **Apple ecosystem integration** (Wallet, MapKit, Sign in, etc.)

---

## 📱 Available Apple Resources (Beyond Maps)

### 1. **Apple MapKit JS** ✅ Already using
- Interactive maps with custom markers
- 3D views, satellite imagery
- Route planning and directions
- Geocoding and reverse geocoding
- Points of interest (POI) search

### 2. **Apple Wallet / PassKit**
NEW - High value for travel app
- Create digital passes for:
  - **Restaurant reservations** (with QR codes)
  - **Hotel bookings** (check-in info, room number)
  - **Event tickets** (if destination has events)
  - **Loyalty cards** (Urban Manual membership)
- Passes update in real-time
- Location-based notifications

### 3. **Apple Sign In** ✅ Already using
- Currently implemented
- Can get more user data: name, verified email

### 4. **Apple Pay** (Web)
NEW - For future premium features
- Quick payments for premium membership
- In-app purchases (pro features)
- Tipping/donations

### 5. **Safari Web Push**
NEW - For notifications
- Push notifications on iOS/macOS Safari
- Arrival reminders ("You're near [Place]")
- Reservation reminders
- New places in saved cities

### 6. **Apple Calendar Integration** (via .ics files)
NEW - For itinerary export
- Export itinerary to Apple Calendar
- Download .ics file with all planned visits
- Reminders for each destination

### 7. **Apple Shortcuts Integration** (via URL schemes)
NEW - Power user features
- Custom Siri shortcuts
- Quick actions ("Add to itinerary", "Mark as visited")
- Automation workflows

---

## 🎨 New Account Page Design

### **Modern Tab-Based Layout**

```
┌─────────────────────────────────────────┐
│  @username                              │
│  John Doe                      [Edit]   │
│  New York, NY                           │
│                                         │
│  📊 25 visited • 🏙️ 8 cities • 🌍 5... │
│                                         │
│  ┌───────┬───────┬────────┬─────────┐  │
│  │Profile│Visited│  Lists │Itinerary│  │
│  └───────┴───────┴────────┴─────────┘  │
│                                         │
│  [DYNAMIC CONTENT BASED ON TAB]         │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🆕 New Features to Add

### **1. Profile Tab (Enhanced)**

#### **Visual Travel Stats**
- 📍 **Places Visited:** 25
- 🏙️ **Cities Explored:** 8
- 🌍 **Countries:** 5
- ⭐ **Michelin Stars Collected:** 12
- 👑 **Crown Destinations:** 3
- 📅 **Travel Days:** 45 days
- 🍽️ **Restaurants:** 18 | ☕ **Cafes:** 7 | 🍸 **Bars:** 5 | 🏨 **Hotels:** 2

#### **Interactive World Map** (Actual MapKit implementation)
- Real interactive map showing visited countries
- Markers for each visited city
- Clustering for dense areas
- Click country/city to see places visited there
- Heatmap showing where you travel most
- 3D globe view option

#### **Travel Timeline**
- Chronological view of all visits
- Month/year grouping
- Photos from each place
- Trip summaries ("Paris Trip - Jun 2024: 5 places")

#### **Achievements & Badges**
- 🎖️ **"World Explorer"** - Visited 5+ countries
- 🌟 **"Michelin Hunter"** - Visited 10+ starred restaurants
- 🗼 **"City Hopper"** - Visited 5+ cities
- 🍽️ **"Foodie"** - Visited 20+ restaurants
- ☕ **"Coffee Connoisseur"** - Visited 10+ cafes
- 👑 **"Crown Collector"** - Visited 3+ crown places
- 🌍 **"Continental"** - Visited 3+ continents
- 📸 **"Documenter"** - Added photos to 10+ places

#### **Travel Personality**
AI-generated insights based on your travel:
- "You're a **Food-Focused Traveler**"
- "Your favorite city is **Tokyo** (8 visits)"
- "You prefer **upscale dining** experiences"
- "You travel mostly during **spring** and **fall**"

#### **Recent Activity Feed**
- "Added Sukiyabashi Jiro to Wishlist" - 2 hours ago
- "Visited Le Bernardin" - 3 days ago
- "Created collection: Best Coffee in Europe" - 1 week ago

---

### **2. Visited Tab (Enhanced)**

#### **View Options**
- 📋 **List View** (current default)
- 🗺️ **Map View** (show all on map)
- 📅 **Timeline View** (chronological)
- 🏙️ **By City** (grouped)
- 🌍 **By Country** (grouped)
- ⭐ **By Rating** (your ratings)

#### **Each Place Card Shows:**
- Large image
- Place name + category
- City, Country
- Date visited
- ⭐ Your rating (editable)
- 📝 Your notes (expandable)
- 📸 Your photos (upload capability)
- 🎫 **"Add to Wallet"** button (create pass)
- ↗️ **"Open in Apple Maps"** button
- 🔗 Share visit (social media)

#### **Filters**
- By category (restaurants, cafes, bars, hotels)
- By city
- By date range
- By rating
- Michelin-starred only
- Crown destinations only

#### **Stats at Top**
- Total visited: 25
- Average rating: 4.3⭐
- Most visited city: Tokyo (8)
- Latest visit: 3 days ago

#### **Bulk Actions**
- Export to CSV
- Download .ics calendar file
- Create collection from selected
- Share as public list

---

### **3. Lists Tab (Collections - NEW)**

#### **What are Lists/Collections?**
- Organize saved places into themed lists
- Can be private or public
- Can be shared with friends
- Can include notes for each place

#### **Example Lists:**
- 🍣 "Best Sushi in Tokyo"
- ☕ "Cafes to Visit in Paris"
- 🏨 "Luxury Hotels Bucket List"
- 🍷 "Wine Bars in NYC"
- 👑 "Crown Destinations Wishlist"

#### **List Card Shows:**
- Cover image (from first place)
- List name
- Description
- Number of places
- 👁️ Private/Public toggle
- Last updated
- Quick preview (first 3 places)

#### **List Detail Page:**
- All places in list
- Drag to reorder
- Add notes to each place
- Map view of all places
- Export to Apple Wallet (all as passes)
- Export to calendar (.ics)
- Share list (link)
- Collaborate (invite others)

#### **Smart Lists (Auto-generated):**
- 🆕 "Recently Saved" (last 10)
- ⭐ "Michelin-Starred" (all starred places)
- 👑 "Crown Destinations" (all crown places)
- 📍 "In [Your City]" (places near you)
- 🔥 "Trending" (popular saves)

---

### **4. Itinerary Tab (NEW - Major Feature)**

#### **What is it?**
- Plan trips with multiple days
- Add places to each day
- Get AI suggestions
- Optimize route
- Export to calendar/Wallet

#### **Layout:**
```
┌─────────────────────────────────┐
│ Paris Trip - Jun 15-18, 2025    │
│ [Edit] [Share] [Export]         │
├─────────────────────────────────┤
│ 📅 Day 1 - Friday, Jun 15       │
│   9:00 AM  Breakfast at Café... │
│   11:00 AM Louvre Museum...     │
│   1:00 PM  Lunch at Le Comp...  │
│   3:00 PM  Eiffel Tower...      │
│   7:00 PM  Dinner at Le Jules.. │
│                                 │
│ 📅 Day 2 - Saturday, Jun 16     │
│   10:00 AM Brunch at Hollybel.. │
│   ...                           │
├─────────────────────────────────┤
│ 🗺️ [Show on Map]               │
│ 📅 [Export to Calendar]         │
│ 🎫 [Add all to Wallet]          │
│ 🤖 [AI: Optimize Route]         │
│ 💡 [AI: Suggest More Places]    │
└─────────────────────────────────┘
```

#### **Features:**
1. **Multiple Itineraries**
   - Create separate trips
   - Archive past trips
   - Duplicate itineraries

2. **Drag & Drop**
   - Reorder places within a day
   - Move places between days
   - Adjust times

3. **AI Features**
   - **Optimize Route:** Minimize travel time
   - **Suggest Places:** Fill gaps in your day
   - **Balance Day:** Don't overbook
   - **Find Alternatives:** If a place is closed

4. **Map Integration**
   - See all places on map
   - Visualize daily route
   - Get directions (Apple Maps)
   - Estimate travel times

5. **Export Options**
   - 📅 **Apple Calendar** (.ics file)
   - 🎫 **Apple Wallet** (passes for each place)
   - 📄 **PDF** (printable itinerary)
   - 🔗 **Share Link** (public view)
   - 📧 **Email** (send to yourself/friends)

6. **Collaboration**
   - Invite friends to edit
   - Comment on places
   - Vote on options
   - Split view (everyone's preferences)

7. **Smart Reminders**
   - Day before: "Your Paris trip starts tomorrow!"
   - Morning: "Today's first stop: Café de Flore at 9 AM"
   - Nearby: "You're near Louvre Museum (on your itinerary)"

---

## 🗺️ World Map Visualization (Redesigned)

### **Current:** Flag grid (simple)
### **New:** Interactive MapKit globe

#### **Features:**
1. **3D Globe View**
   - Rotate and zoom
   - Countries you've visited highlighted
   - Cities marked with pins
   - Click to zoom into country

2. **Cluster Mode**
   - Shows number of places per city
   - Heatmap coloring (more visits = brighter)
   - Click cluster to expand

3. **Stats Overlay**
   - Total countries: 5
   - Total cities: 8
   - Continents visited: 3
   - % of world covered: 2.5%

4. **Filters**
   - Show only visited (green)
   - Show saved but not visited (yellow)
   - Show visited in date range
   - Show by category

5. **Achievements on Map**
   - Badges appear on countries when unlocked
   - "First country!" badge on map
   - "10 cities in Asia" badge

6. **Interactive**
   - Click country → See places visited
   - Click city → See destination list
   - Draw route between cities (your travel path)
   - Time-lapse mode (watch your travels grow)

---

## 💰 Premium Features (Optional - for future)

### **Free Tier (Current)**
- Basic profile
- Saved/visited places
- 3 lists maximum
- 1 active itinerary
- Basic map

### **Pro Tier ($9.99/month or $79/year)**
- ✨ Unlimited lists/collections
- ✨ Unlimited itineraries
- ✨ AI itinerary optimization
- ✨ Apple Wallet pass generation
- ✨ Advanced map visualizations (3D, heatmap)
- ✨ Export to PDF/calendar
- ✨ Collaboration features
- ✨ Remove ads (if any)
- ✨ Priority AI support
- ✨ Early access to new features
- ✨ Custom achievements
- ✨ Travel analytics dashboard

---

## 📊 Data Model Changes

### **New Tables Needed:**

```sql
-- Collections (lists)
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  cover_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Collection items (places in lists)
CREATE TABLE collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  destination_slug TEXT NOT NULL,
  notes TEXT,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW()
);

-- Itineraries
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Itinerary days
CREATE TABLE itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  notes TEXT
);

-- Itinerary items (places in days)
CREATE TABLE itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_day_id UUID REFERENCES itinerary_days(id) ON DELETE CASCADE,
  destination_slug TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User achievements
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  achievement_code TEXT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_code)
);

-- Visited place photos
CREATE TABLE visited_place_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  destination_slug TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Apple Wallet passes (track generated passes)
CREATE TABLE wallet_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  destination_slug TEXT NOT NULL,
  pass_type TEXT, -- 'reservation', 'bookmark', 'visit'
  pass_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

---

## 🎨 Design Guidelines (Keep Your Style)

### **What to KEEP:**
- ✅ Clean, minimal aesthetic
- ✅ Black/white primary colors
- ✅ Existing fonts (system fonts)
- ✅ Card-based layouts
- ✅ Responsive breakpoints

### **What to IMPROVE:**
- ✨ Better mobile spacing (already started)
- ✨ Touch-friendly buttons (already started)
- ✨ Smooth animations (60fps)
- ✨ Loading states (skeletons)
- ✨ Empty states (helpful messages)

---

## 🚀 Implementation Phases

### **Phase 1: Foundation (Week 1)** - $150-200 credits
- [x] Mobile UI fixes (DONE!)
- [x] Apple Map fixes (DONE!)
- [ ] Database migrations (new tables)
- [ ] Update user_profiles table
- [ ] Basic data fetching hooks

### **Phase 2: Collections/Lists (Week 1)** - $200-250 credits
- [ ] Collections CRUD (create, read, update, delete)
- [ ] Collection detail page
- [ ] Add to collection from destination
- [ ] Drag & drop reordering
- [ ] Public/private toggle
- [ ] Smart lists (auto-generated)

### **Phase 3: Enhanced Visited (Week 1-2)** - $150-200 credits
- [ ] View mode toggles (list, map, timeline, grouped)
- [ ] Filters (category, city, date, rating)
- [ ] Photo upload to visited places
- [ ] Better place cards with all features
- [ ] Export options (CSV, calendar)

### **Phase 4: Account Profile Tab (Week 2)** - $200-250 credits
- [ ] Visual stats dashboard
- [ ] Achievement system
- [ ] Travel personality insights
- [ ] Activity feed
- [ ] Better header with username/avatar

### **Phase 5: World Map Redesign (Week 2)** - $150-200 credits
- [ ] Replace flag grid with MapKit globe
- [ ] Interactive country/city markers
- [ ] Heatmap visualization
- [ ] Stats overlay
- [ ] Click interactions

### **Phase 6: Itinerary Builder (Week 2-3)** - $300-400 credits
- [ ] Itinerary CRUD
- [ ] Day/item management
- [ ] Drag & drop
- [ ] Time scheduling
- [ ] Map view integration
- [ ] AI route optimization
- [ ] AI suggestions

### **Phase 7: Apple Wallet Integration (Week 3)** - $150-200 credits
- [ ] PassKit integration (backend)
- [ ] Generate passes for bookmarks
- [ ] Generate passes for reservations
- [ ] Download pass endpoints
- [ ] Add to Wallet buttons everywhere

### **Phase 8: Export & Share Features (Week 3)** - $100-150 credits
- [ ] Calendar export (.ics)
- [ ] PDF export (itineraries)
- [ ] Public sharing links
- [ ] Social media share previews

### **Phase 9: Mobile Gestures & Polish (Week 3-4)** - $200-250 credits
- [ ] Swipe-to-close drawer
- [ ] Pull-to-refresh on lists
- [ ] Haptic feedback (iOS)
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Error boundaries

---

## 📱 Mobile-Specific Features

### **iOS Safari**
- Add to Home Screen prompt
- App-like experience (no browser chrome)
- Native-feeling animations

### **Gestures**
- Swipe right to go back
- Swipe down to close modals
- Long-press for context menus
- Pinch to zoom (on maps)

### **Performance**
- Lazy load images below fold
- Virtual scrolling for long lists
- Optimistic updates (instant UI response)
- Background data sync

---

## 🎯 Success Metrics

### **User Engagement**
- Time on account page (target: +50%)
- Collections created per user (target: 3+)
- Itineraries created per user (target: 1+)
- Visited places marked (target: 10+ per user)

### **Feature Adoption**
- % users creating collections: 40%+
- % users creating itineraries: 25%+
- % users uploading photos: 15%+
- % users using Apple Wallet: 10%+ (iOS users)

### **Technical**
- Page load time: <2s
- Time to interactive: <3s
- Mobile PageSpeed: 90+
- Zero-click interactions: 80%+ success

---

## 💡 Additional Ideas (Future)

1. **Social Features**
   - Follow other travelers
   - See friends' recent visits
   - Comment on places
   - Like/react to visits

2. **AI Travel Assistant**
   - Chat with AI about travel plans
   - Get personalized recommendations
   - "Where should I go in Tokyo for sushi?"
   - "Plan a 3-day Paris itinerary for me"

3. **Travel Journal**
   - Rich text notes for each visit
   - Markdown support
   - Photo galleries
   - Export as blog post

4. **Gamification**
   - Leaderboards (most visited in city)
   - Challenges ("Visit 5 Michelin places this month")
   - Streaks (days in a row visiting)
   - Collectibles (digital souvenirs)

5. **Apple Shortcuts Integrations**
   - "Hey Siri, add [Place] to my wishlist"
   - "Hey Siri, mark [Place] as visited"
   - "Hey Siri, what's on my itinerary today?"

6. **Offline Mode**
   - Download places for offline viewing
   - Offline maps
   - Sync when back online

---

## ✅ Ready to Start?

**Recommendation:** Start with **Phase 1-2** (Database + Collections) since they're foundational for everything else.

**Estimated Timeline:**
- Weeks 1-2: Phases 1-5 (Foundation + Core Features)
- Week 3: Phases 6-8 (Itinerary + Apple Integration + Export)
- Week 4: Phase 9 (Polish + Mobile Gestures)

**Total Estimated Credits:** $1600-2200 (will need to prioritize to fit $1000 budget)

**For $1000 budget, recommend:**
- ✅ Phases 1-3 (Foundation + Collections + Enhanced Visited) - $500-650
- ✅ Phase 4-5 (Profile + World Map) - $350-450
- ✅ Basic Phase 6 (Simple itinerary without all AI features) - $150-200

**Total: ~$1000-1300** (slight overage, can cut features)

---

**What do you want to tackle first?**
