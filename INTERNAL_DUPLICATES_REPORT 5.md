# Internal Duplicates Report - Supabase Database

**Date:** November 01, 2025  
**Analysis Type:** Internal duplicate detection within existing database

---

## Executive Summary

We analyzed all **924 destinations** in your Supabase database to find internal duplicates. The good news: your database is relatively clean! However, we found **1 exact duplicate** and **3 high-confidence duplicates** that should be reviewed and merged.

---

## Findings

### 🔴 Exact Duplicates (100% Match) - **1 Found**

These have identical names in the same city. **IMMEDIATE ACTION REQUIRED.**

#### 1. **The Mark** (New York)
- **Entry 1:** ID `1676`, Slug: `the-mark`, Category: Hotel
- **Entry 2:** ID `1677`, Slug: `the-mark-hotel`, Category: Hotel

**Recommendation:** These are definitely the same hotel. You should:
1. Choose which entry to keep (probably ID 1676 with the shorter slug)
2. Merge any unique data from the other entry
3. Delete the duplicate entry

---

### 🟠 High-Confidence Duplicates (90-99% Match) - **3 Found**

These are very likely the same place with slightly different names.

#### 1. **Park Hyatt Milan** vs **Park Hyatt Milano** (Milan)
- **Similarity:** 97.0%
- **Entry 1:** ID `1477`, Slug: `park-hyatt-milan`, Category: Hotel
- **Entry 2:** ID `1478`, Slug: `park-hyatt-milano`, Category: Hotel

**Analysis:** "Milan" (English) vs "Milano" (Italian) - same hotel, different language.

**Recommendation:** Merge these. Keep one (probably the English version "Milan" for consistency).

---

#### 2. **Hotel Higashiyama by Kyoto Tokyu** vs **The Hotel Higashiyama Kyoto Tokyu** (Kyoto)
- **Similarity:** 95.1%
- **Entry 1:** ID `1242`, Slug: `hotel-higashiyama-by-kyoto-tokyu`, Category: Hotel
- **Entry 2:** ID `1659`, Slug: `the-hotel-higashiyama-kyoto-tokyu`, Category: Hotel

**Analysis:** Same hotel, one has "The" prefix and slightly different wording.

**Recommendation:** Merge these. Choose the official hotel name.

---

#### 3. **Palace Hotel Tokyo** vs **Pace Tokyo** (Tokyo)
- **Similarity:** 90.9%
- **Entry 1:** ID `1466`, Slug: `palace-hotel-tokyo`, Category: Hotel
- **Entry 2:** ID `1465`, Slug: `pace-tokyo`, Category: Others

**Analysis:** This might be a typo ("Pace" instead of "Palace") or they could be different places.

**Recommendation:** **Manual review needed.** Check if "Pace Tokyo" is:
- A typo for "Palace Hotel Tokyo" → Merge
- A different venue (restaurant/bar inside Palace Hotel) → Keep separate
- A completely different place → Keep separate

---

### 🟡 Medium-Confidence Matches (80-89% Match) - **21 Found**

These might be duplicates or might be legitimately different locations of the same brand.

#### Likely Different Locations (Not Duplicates):

1. **Blue Bottle Coffee** locations (multiple in Seoul, Kobe)
   - These are different branches of the same chain
   - **Keep separate** ✅

2. **Four Seasons Hotel Tokyo at Marunouchi** vs **Four Seasons Hotel Tokyo at Otemachi**
   - Two different Four Seasons properties in Tokyo
   - **Keep separate** ✅

3. **Mandarin Oriental Hyde Park** vs **Mandarin Oriental Mayfair** (London)
   - Two different Mandarin Oriental properties in London
   - **Keep separate** ✅

#### Potential Duplicates (Need Review):

4. **Samaritaine** vs **La Samaritaine** (Paris)
   - Similarity: 88.0%
   - Likely the same place (with/without "La")
   - **Review and possibly merge** ⚠️

5. **Faena Hotel Miami Beach** vs **Casa Faena Miami Beach** (Miami)
   - Similarity: 87.2%
   - Could be two different Faena properties or same place
   - **Review needed** ⚠️

6. **Experimental Marais** vs **Hotel Experimental Marais** (Paris)
   - Similarity: 86.4%
   - Likely the same hotel (with/without "Hotel" prefix)
   - **Review and possibly merge** ⚠️

7. **The Maybourne Beverly Hills** vs **Marea Beverly Hills** (Los Angeles)
   - Similarity: 85.7%
   - Probably different (Maybourne is a hotel, Marea is a restaurant)
   - **Keep separate** ✅

8. **Hotel Toranomon Hills** vs **Toranomon Hills** (Tokyo)
   - Similarity: 83.3%
   - Could be hotel vs. the building complex
   - **Review needed** ⚠️

<details>
<summary>View all 21 medium-confidence matches</summary>

1. Blue Bottle Coffee Kobe Hankyu Cafe vs Blue Bottle Coffee Kobe Hankyu Shop (88.6%)
2. Samaritaine vs La Samaritaine (88.0%)
3. Blue Bottle Coffee Samseong Cafe vs Blue Bottle Coffee Myeongdong Cafe (87.9%)
4. Faena Hotel Miami Beach vs Casa Faena Miami Beach (87.2%)
5. Blue Bottle Coffee Samseong Cafe vs Blue Bottle Coffee Jamsil Cafe (87.1%)
6. Four Seasons Hotel Tokyo at Marunouchi vs Four Seasons Hotel Tokyo at Otemachi (87.1%)
7. Experimental Marais vs Hotel Experimental Marais (86.4%)
8. The Maybourne Beverly Hills vs Marea Beverly Hills (85.7%)
9. Mandarin Oriental Hyde Park, London vs Mandarin Oriental Mayfair, London (84.8%)
10. Hotel Toranomon Hills vs Toranomon Hills (83.3%)
... and 11 more

</details>

---

### 🟢 Low-Confidence Matches (70-79% Match) - **90 Found**

These are probably different places with similar names. Not showing details as they're likely false positives.

---

## Recommended Actions

### Priority 1: Fix Exact Duplicate (Required)

**The Mark (New York)** - IDs 1676 and 1677
```sql
-- Option A: Delete the duplicate (after verifying no unique data)
DELETE FROM destinations WHERE id = 1677;

-- Option B: Merge data first, then delete
-- 1. Manually check if ID 1677 has any unique data (images, descriptions, etc.)
-- 2. If yes, update ID 1676 with that data
-- 3. Then delete ID 1677
```

### Priority 2: Review High-Confidence Duplicates (Recommended)

1. **Park Hyatt Milan/Milano** - Merge (same hotel)
2. **Hotel Higashiyama variations** - Merge (same hotel)
3. **Palace Hotel Tokyo / Pace Tokyo** - Investigate first

### Priority 3: Review Medium-Confidence Matches (Optional)

Focus on these 5:
1. Samaritaine vs La Samaritaine
2. Faena Hotel vs Casa Faena
3. Experimental Marais variations
4. Hotel Toranomon Hills vs Toranomon Hills
5. Blue Bottle Coffee Kobe variations

---

## How to Merge Duplicates

### Step 1: Identify the "Keep" Record
Choose which record to keep based on:
- Better slug (shorter, cleaner)
- More complete data (more fields filled)
- Better images

### Step 2: Merge Unique Data
```sql
-- Example: Merge The Mark hotels
-- First, check what data each has
SELECT * FROM destinations WHERE id IN (1676, 1677);

-- If ID 1677 has unique data (e.g., better images), update ID 1676
UPDATE destinations 
SET 
  image = 'better_image_url',
  gallery = array_cat(gallery, (SELECT gallery FROM destinations WHERE id = 1677))
WHERE id = 1676;
```

### Step 3: Update References
```sql
-- Update any foreign key references (if any)
UPDATE saved_destinations SET destination_id = 1676 WHERE destination_id = 1677;
UPDATE list_destinations SET destination_id = 1676 WHERE destination_id = 1677;
```

### Step 4: Delete Duplicate
```sql
DELETE FROM destinations WHERE id = 1677;
```

---

## Prevention Strategy

To prevent future duplicates:

1. **Add a unique constraint** on (name, city):
```sql
-- This will prevent exact duplicate names in the same city
CREATE UNIQUE INDEX idx_destinations_name_city ON destinations(LOWER(name), city);
```

2. **Implement fuzzy matching** in your admin interface when adding new destinations

3. **Regular audits** - Run this duplicate detection script quarterly

---

## Files Generated

- `/home/ubuntu/urban-manual/internal_duplicates.json` - Complete duplicate data
- `/home/ubuntu/urban-manual/INTERNAL_DUPLICATES_REPORT.md` - This report

---

## Summary

| Severity | Count | Action Required |
|:---------|:------|:----------------|
| 🔴 Exact duplicates | 1 | **Yes - merge immediately** |
| 🟠 High confidence | 3 | **Yes - review and merge** |
| 🟡 Medium confidence | 21 | Optional - review when time permits |
| 🟢 Low confidence | 90 | No - likely false positives |

**Overall:** Your database is in good shape! Only 4 duplicates need immediate attention.

---

**Next Step:** Would you like me to create a script to help you merge these duplicates safely?

