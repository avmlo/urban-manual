# Duplicate Analysis Report

**Date:** November 01, 2025  
**Analysis Type:** CSV vs Supabase Database Comparison

---

## Executive Summary

After analyzing the CSV file against your Supabase database, we found that **most of the "skipped" destinations already exist in your database** with slightly different slugs (usually due to special character handling).

### Key Findings

- **Total destinations in CSV:** 586
- **Total destinations in Supabase:** 921
- **Skipped during import:** 40
- **Actual duplicates found:** 63 (100% name match)
- **True missing destinations:** Only **10** are genuinely new

---

## The Problem: Unicode Character Slugs

The main issue is **slug normalization**. Your Supabase database uses **Unicode-aware slugs** (preserving special characters like é, ō, ®), while the CSV uses **ASCII-only slugs** (converting special characters).

### Examples:

| CSV Slug | Supabase Slug | Status |
|----------|---------------|--------|
| `apotheose` | `apothéose` | ✅ Same place, different slug |
| `labeille` | `l-abeille` | ✅ Same place, different slug |
| `tairroir` | `taïrroir` | ✅ Same place, different slug |
| `otani-sanso` | `ōtani-sansō` | ✅ Same place, different slug |
| `moma` | `the-museum-of-modern-art` | ✅ Same place, different slug |

---

## High Confidence Duplicates (100% Match)

These **63 destinations** have identical names and cities but different slugs. They are **definitely the same place**.

### Recommendation: **UPDATE existing records, don't create new ones**

<details>
<summary>View all 63 high-confidence duplicates</summary>

1. **1, Place Vendôme** (paris)
   - CSV: `1-place-vendome` 
   - DB: `1-place-vendôme` (ID: 968)

2. **Aimé Leon Dore** (new-york)
   - CSV: `aime-leon-dore`
   - DB: `aimé-leon-dore` (ID: 986)

3. **Amâlia** (paris)
   - CSV: `amalia`
   - DB: `amâlia` (ID: 1003)

4. **Arpège** (paris)
   - CSV: `arpege`
   - DB: `arpège` (ID: 1024)

5. **BBVA México Tower** (mexico-city)
   - CSV: `bbva-mexico-tower`
   - DB: `bbva-méxico-tower` (ID: 1054)

6. **Bourse de Commerce - Pinault Collection** (paris)
   - CSV: `bourse-de-commerce---pinault-collection`
   - DB: `bourse-de-commerce-pinault-collection` (ID: 1073)

7. **Bvlgari Il Ristorante – Niko Romito, Tokyo** (tokyo)
   - CSV: `bvlgari-il-ristorante---niko-romito-tokyo`
   - DB: `bvlgari-il-ristorante-niko-romito-tokyo` (ID: 1083)

8. **Café Boulud** (new-york)
   - CSV: `cafe-boulud`
   - DB: `café-boulud` (ID: 1084)

9. **Café Carmellini** (new-york)
   - CSV: `cafe-carmellini`
   - DB: `café-carmellini` (ID: 1085)

10. **Cecchi's** (new-york)
    - CSV: `cecchis`
    - DB: `cecchi-s` (ID: 1098)

... (and 53 more)

</details>

---

## Low Confidence Matches (70-80%)

These **10 destinations** have similar names but might be different places:

1. **AP Café Singapore** vs **Capella Singapore** (76.5% match)
   - Likely **different** - one is a café, one is a hotel

2. **AP Café Singapore** vs **Andaz Singapore** (75.0% match)
   - Likely **different** - one is a café, one is a hotel

3. **Café Carlyle** vs **Café Carmellini** (74.1% match)
   - Likely **different** - different restaurants

4. **Café Carlyle** vs **The Carlyle** (73.7% match)
   - Possibly **related** - Café Carlyle is inside The Carlyle Hotel

5. **Hôtel Hana** vs **Hôtel Balzac** (72.7% match)
   - Likely **different** - different hotels

6. **L'Oiseau Blanc** vs **Le Restaurant Blanc** (72.7% match)
   - Likely **different** - different restaurants

7. **The Museum of Modern Art** vs **Whitney Museum of American Art** (72.0% match)
   - Definitely **different** - different museums

8. **Fouquet's New York** vs **Four Seasons Hotel New York** (71.8% match)
   - Definitely **different** - different hotels

9. **laïzé palais-royal** vs **Grand Hotel du Palais Royal** (71.8% match)
   - Likely **different** - restaurant vs hotel

10. **AP Café Singapore** vs **Raffles Singapore** (70.6% match)
    - Likely **different** - café vs hotel

---

## Truly Missing Destinations

After filtering out duplicates, only **10 destinations** from the CSV are genuinely missing from your database:

### New Destinations to Add:

1. **Dowling's** (new-york) - Dining
2. **Flôr** (porto) - Dining
3. **GrandCœur** (paris) - Dining, Brand: mauro-colagreco
4. **Héritage by Kei Kobayashi** (tokyo) - Dining, Brand: kei-kobayashi
5. **I'm donut ? Nakameguro** (tokyo) - Dining
6. **Jane's Carousel** (new-york) - Architect: jean-nouvel
7. **Jeffrey's Grocery** (new-york) - Dining
8. **Kamaro'an House** (taipei)
9. **La Maison Champs Élysées** (paris) - Hotel
10. **La Tête D'Or** (new-york) - Dining, Brand: daniel-boulud

Plus a few more that need manual review (the low-confidence matches).

---

## Recommended Actions

### 1. Update Existing Records (63 destinations)

For the high-confidence duplicates, we should **update the existing Supabase records** with the CSV data instead of creating new entries. This will add the architect, brand, and gallery information to the correct existing records.

I can create a script that:
- Matches by name + city (instead of slug)
- Updates the existing record with CSV data
- Preserves the existing Supabase slug

### 2. Add New Destinations (10-20 destinations)

For the truly missing destinations, we can safely add them as new records.

### 3. Manual Review (10 destinations)

The low-confidence matches need your review to determine if they're duplicates or genuinely different places.

---

## Next Steps

**Option A: Conservative Approach**
- Only add the 10 confirmed new destinations
- Skip the duplicates (they already exist)

**Option B: Complete Merge (Recommended)**
- Update the 63 existing records with CSV data
- Add the 10 new destinations
- Manually review the 10 low-confidence matches

Which approach would you prefer?

---

## Files Generated

- `/home/ubuntu/urban-manual/missing_destinations.json` - All 40 originally skipped destinations
- `/home/ubuntu/urban-manual/potential_duplicates.json` - Detailed duplicate analysis
- `/home/ubuntu/urban-manual/DUPLICATE_ANALYSIS_REPORT.md` - This report

