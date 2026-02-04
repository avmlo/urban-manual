# Category Enrichment Analysis
**Complete list of categories and how they are grouped in the enrichment process**

---

## 📊 Current Database Categories

Based on `category_analysis.json`, these are the categories currently in the database:

| Category | Count | Percentage |
|----------|-------|------------|
| **Dining** | 413 | 45.1% |
| **Hotel** | 292 | 31.9% |
| **Bar** | 32 | 3.5% |
| **Cafe** | 29 | 3.2% |
| **Culture** | 62 | 6.8% |
| **Other** | 29 | 3.2% |
| **Shopping** | 50 | 5.5% |
| **Bakery** | 7 | 0.8% |
| **Park** | 1 | 0.1% |

**Total:** 915 destinations

---

## 🗺️ Google Place Types → Category Mapping

The enrichment function (`lib/enrichment.ts`) maps Google Place types to categories as follows:

### **Dining** (3 Google types)
- `restaurant` → Dining
- `meal_takeaway` → Dining
- `meal_delivery` → Dining

### **Cafe** (1 Google type)
- `cafe` → Cafe

### **Bar** (2 Google types)
- `bar` → Bar
- `night_club` → Bar

### **Hotel** (1 Google type)
- `lodging` → Hotel

### **Culture** (4 Google types)
- `museum` → Culture
- `art_gallery` → Culture
- `library` → Culture
- `tourist_attraction` → Culture

### **Shopping** (10 Google types)
- `shopping_mall` → Shopping
- `store` → Shopping
- `clothing_store` → Shopping
- `shoe_store` → Shopping
- `jewelry_store` → Shopping
- `electronics_store` → Shopping
- `book_store` → Shopping
- `furniture_store` → Shopping
- `home_goods_store` → Shopping
- `department_store` → Shopping

### **Bakery** (1 Google type)
- `bakery` → Bakery

### **Park** (1 Google type)
- `park` → Park

### **Other** (6 Google types)
- `spa` → Other
- `gym` → Other
- `beauty_salon` → Other
- `hair_care` → Other
- `establishment` → Other
- `point_of_interest` → Other

**Total Google types mapped:** 29 types

---

## ⚠️ Issues & Inconsistencies

### 1. **Wellness Category Missing**
The `category_analysis.json` mentions a "Wellness" category with these Google types:
- `spa`
- `gym`
- `beauty_salon`
- `hair_care`

But in the actual enrichment code (`lib/enrichment.ts`), these are all mapped to "Other" instead of "Wellness".

**Recommendation:** Create a "Wellness" category or keep them as "Other" but be consistent.

### 2. **Gemini Prompt Mismatch**
The Gemini AI prompt (`generateGeminiTags`) suggests these categories:
- Restaurants
- Cafes
- Bars
- Hotels
- Culture
- Shopping
- Nightlife
- Activities
- Other

But the actual database uses:
- Dining (not "Restaurants")
- Cafe (matches)
- Bar (matches)
- Hotel (matches)
- Culture (matches)
- Shopping (matches)
- No "Nightlife" (it's "Bar")
- No "Activities" (it's "Park" or "Other")
- Other (matches)

**Recommendation:** Update the Gemini prompt to match actual database categories.

### 3. **Missing Google Types**
There are many Google Place types that are not mapped. Common ones that might be useful:
- `amusement_park` → Could be "Park" or "Other"
- `aquarium` → Could be "Culture"
- `zoo` → Could be "Culture" or "Park"
- `stadium` → Could be "Other" or new "Sports" category
- `casino` → Could be "Bar" or "Other"
- `movie_theater` → Could be "Culture" or "Other"
- `bowling_alley` → Could be "Other"
- `rv_park` → Could be "Park" or "Hotel"
- `campground` → Could be "Park" or "Hotel"

---

## 📋 Complete Category List

### **Primary Categories (Currently Used)**
1. **Dining** - Restaurants, meal delivery, takeaway
2. **Hotel** - Lodging, accommodations
3. **Bar** - Bars, nightclubs
4. **Cafe** - Coffee shops, cafes
5. **Culture** - Museums, galleries, libraries, attractions
6. **Shopping** - All retail stores
7. **Bakery** - Bakeries
8. **Park** - Parks
9. **Other** - Everything else (spa, gym, salons, generic establishments)

### **Potential New Categories**
- **Wellness** - Spa, gym, beauty salon, hair care (currently in "Other")
- **Sports** - Stadium, sports complex (currently in "Other")
- **Entertainment** - Movie theater, bowling, arcade (currently in "Other")

---

## 🔄 Enrichment Priority

The enrichment process uses this priority order:

1. **Google Place Types** (highest priority)
   - Uses `categorizePlaceFromTypes()` function
   - Maps Google types directly to categories

2. **Gemini AI Suggestion** (fallback)
   - Uses `generateGeminiTags()` function
   - AI suggests category based on name, location, description

3. **Existing Category** (last resort)
   - Keeps the category that's already in the database

---

## 📝 Recommendations

1. **Standardize Wellness**: Either create a "Wellness" category or document why spa/gym/salon are "Other"

2. **Update Gemini Prompt**: Change the prompt to match actual database categories:
   ```
   Categories should be one of: Dining, Cafe, Bar, Hotel, Culture, Shopping, Bakery, Park, Other.
   ```

3. **Add Missing Mappings**: Consider adding mappings for common Google types like:
   - `amusement_park` → Park
   - `aquarium` → Culture
   - `zoo` → Culture
   - `movie_theater` → Culture or Other
   - `stadium` → Other (or create Sports category)

4. **Review "Other" Category**: Many things fall into "Other". Consider if some should have their own categories or be better mapped.

5. **Consistency Check**: Ensure `category_analysis.json` matches the actual enrichment code.

---

## 🔍 Category Distribution Analysis

From the category changes log, we can see:
- Most common change: "Others → Dining" (79 changes)
- "Others → Shopping" (44 changes)
- "Hotel → Dining" (62 changes) - suggests some hotels might be misclassified
- "Bar → Dining" (21 changes) - suggests some bars might be restaurants

This suggests the "Others" category was used as a catch-all and is being refined.

