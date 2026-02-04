# Enriched Google Places API Data Summary

## Fields Currently Being Fetched from Database

### ✅ Currently Displayed in Drawer:

1. **formatted_address** - Full address ✅
2. **vicinity** - Short address ✅
3. **international_phone_number** - Phone number (clickable) ✅
4. **website** - Website URL (clickable) ✅
5. **rating** - Google rating (1-5 stars) ✅
6. **user_ratings_total** - Number of reviews ✅
7. **price_level** - Price level ($, $$, $$$, $$$$) ✅
8. **business_status** - Shows if NOT OPERATIONAL ✅
9. **editorial_summary** - Google's editorial description ✅
10. **opening_hours** / **current_opening_hours** - Opening hours with "Open now" status ✅
11. **place_types** - Place categories (restaurant, cafe, etc.) ✅
12. **reviews** - Top 3 Google reviews ✅

### ❌ Fetched but NOT Currently Displayed:

1. **google_name** - Official Google Places name (might differ from our name)
2. **latitude** / **longitude** - GPS coordinates (could use for map pins)
3. **plus_code** - Plus code location identifier (like "8FVC+2M Tokyo")
4. **adr_address** - HTML-formatted structured address
5. **address_components** - Parsed address components (street, city, country, etc.)
6. **utc_offset** - UTC offset in minutes (for timezone calculations)
7. **timezone_id** - Timezone identifier (e.g., "Asia/Tokyo")
8. **secondary_opening_hours** - Additional hours (delivery, pickup, etc.)
9. **icon_url** - Google Places icon URL
10. **icon_background_color** - Icon background color
11. **icon_mask_base_uri** - Icon mask base URI
12. **google_place_id** - Google's unique place ID

## Potential Uses for Unused Fields:

- **latitude/longitude**: Could add interactive map with precise location
- **plus_code**: Alternative location sharing method
- **address_components**: Could parse and display formatted address parts
- **secondary_opening_hours**: Show delivery/pickup hours separately
- **google_place_id**: Direct link to Google Maps place
- **google_name**: Show if different from our database name
- **timezone_id/utc_offset**: More accurate timezone handling for opening hours

## Next Steps to Display More Info:

1. Add latitude/longitude to map view
2. Display secondary opening hours (delivery, pickup)
3. Show parsed address components in a structured format
4. Use google_place_id for direct Google Maps link
5. Display plus_code as alternative location reference

