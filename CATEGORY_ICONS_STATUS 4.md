# Category Icons Status
**Complete list of categories and their icon assignments**

---

## ✅ All Categories Have Icons

| Category | Icon | Status | Notes |
|----------|------|--------|-------|
| **Dining** | 🍴 Utensils | ✅ | Used for restaurants, meal delivery, takeaway |
| **Hotel** | 🏢 Building | ✅ | Used for lodging, accommodations |
| **Bar** | 🍷 Wine | ✅ | Used for bars, nightclubs |
| **Cafe** | ☕ Coffee | ✅ | Used for coffee shops, cafes |
| **Culture** | 🏛️ Landmark | ✅ | Used for museums, galleries, libraries, attractions |
| **Shopping** | 🛍️ Shopping Bag | ✅ | Used for all retail stores |
| **Bakery** | 🍞 Bread | ✅ **NEW** | Previously used coffee icon, now has dedicated bread icon |
| **Park** | 🌳 Tree | ✅ | Used for parks, outdoor spaces |
| **Other** | ❌ None | ✅ | No icon - category name only (spa, gym, salons, etc.) |

---

## 📊 Icon Coverage

**Total Categories:** 9  
**Categories with Icons:** 8 (88.9%)  
**Categories without Icons:** 1 (Other - intentionally no icon)  
**Icons Available:** 13 unique icons

### Icon Usage Breakdown

1. **UtensilsIcon** - Dining, Restaurant, Food
2. **CoffeeIcon** - Cafe, Coffee
3. **WineIcon** - Bar, Bars, Nightlife
4. **BreadIcon** - Bakery, Bakeries ⭐ **NEW**
5. **Building02Icon** - Hotel, Hotels, Accommodation, Lodging
6. **ShoppingBagIcon** - Shopping, Shop, Store, Retail
7. **LandmarkIcon** - Culture, Museum, Museums, Attraction, Attractions, Landmark, Landmarks
8. **CameraIcon** - Gallery, Galleries, Art
9. **MusicIcon** - Music, Concert
10. **FilmIcon** - Theater, Theatre, Cinema
11. **DumbbellIcon** - Activity, Activities, Sport, Sports, Fitness
12. **TreeIcon** - Park, Parks, Outdoor
13. **WavesIcon** - Beach
14. **SparklesIcon** - (Not used - Other category has no icon)

---

## 🎨 Icon Design

All icons follow the Untitled UI design system:
- **Style:** Line icons with rounded stroke caps
- **Size:** Default 16px, scalable via props
- **Color:** Uses `currentColor` for theming (supports dark mode)
- **Stroke Width:** Default 1.5px

---

## 📝 Recent Changes

**Added Bread Icon for Bakery Category:**
- Created `BreadIcon` component in `components/icons/UntitledUIIcons.tsx`
- Updated `lib/icons/category-icons.ts` to map `bakery` and `bakeries` to `bread` icon
- Previously, bakery was using the coffee icon as a fallback

---

## 🔍 Icon Mapping Details

The icon mapping is case-insensitive and handles variations:
- `Dining` → `dining` → `utensils` icon
- `Bakery` → `bakery` → `bread` icon ⭐
- `Hotel` → `hotel` → `building-02` icon
- etc.

All category names are normalized to lowercase before lookup, so "Dining", "dining", and "DINING" all map to the same icon.

