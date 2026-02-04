# Google Places API Available Fields

## Currently Fetched Fields (in `/api/enrich-google`)

1. **formatted_address** - Full formatted address
2. **international_phone_number** - Phone number in international format
3. **website** - Official website URL
4. **price_level** - Price level (0-4)
5. **rating** - Average rating (1-5)
6. **user_ratings_total** - Total number of ratings
7. **opening_hours** - Regular opening hours
8. **current_opening_hours** - Current/special opening hours
9. **secondary_opening_hours** - Additional hours (e.g., delivery, pickup)
10. **plus_code** - Plus code for location
11. **geometry** - Location coordinates (lat/lng)
12. **review** - Reviews (up to 5)
13. **business_status** - Operational status
14. **editorial_summary** - Google's editorial summary
15. **name** - Official name from Google
16. **types** - Place types/categories
17. **utc_offset** - UTC offset in minutes
18. **vicinity** - Short address
19. **adr_address** - Structured address (HTML)
20. **address_components** - Parsed address components
21. **icon** - Place icon URL
22. **icon_background_color** - Icon background color
23. **icon_mask_base_uri** - Icon mask base URI

## Additional Fields We Could Fetch

### Photos
- **photos** - Array of photo objects
  - Use: Display place photos (requires separate API call for photo URLs)

### Additional Details
- **url** - Direct Google Maps URL for the place
- **permanently_closed** - Boolean indicating if permanently closed
- **wheelchair_accessible_entrance** - Accessibility information
- **reservable** - Whether reservations are available (restaurants)
- **takeout** - Takeout available (restaurants)
- **delivery** - Delivery available (restaurants)
- **dine_in** - Dine-in available (restaurants)
- **curbside_pickup** - Curbside pickup available
- **serves_breakfast** - Breakfast service (restaurants)
- **serves_lunch** - Lunch service (restaurants)
- **serves_dinner** - Dinner service (restaurants)
- **serves_brunch** - Brunch service (restaurants)
- **serves_wine** - Wine service available
- **serves_beer** - Beer service available
- **serves_vegetarian_food** - Vegetarian options
- **serves_breakfast_lunch_dinner** - Combined service indicator

### Service Options
- **takeout** - Takeout available
- **delivery** - Delivery available  
- **dine_in** - Dine-in available
- **reservable** - Reservations accepted
- **serves_breakfast** - Breakfast served
- **serves_lunch** - Lunch served
- **serves_dinner** - Dinner served

### Payment Options
- **payment_options** - Accepted payment methods (not directly available, but can be inferred)

### Accessibility
- **wheelchair_accessible_entrance** - Wheelchair accessible
- **wheelchair_accessible_parking** - Accessible parking

### Current Information
- **current_opening_hours** - Already fetching
- **secondary_opening_hours** - Already fetching

## API Usage Notes

- Each field in the `fields` parameter counts toward billing
- Use only the fields you need to minimize costs
- Photos require a separate API call with photo reference
- Some fields are only available for certain place types (e.g., restaurant-specific fields)

## Recommended Next Fields to Add

1. **url** - Direct Google Maps link (useful for users)
2. **photos** - Place photos (requires photo API integration)
3. **permanently_closed** - Important status check
4. **wheelchair_accessible_entrance** - Accessibility info
5. Restaurant-specific fields if enriching restaurants:
   - **takeout**, **delivery**, **dine_in**
   - **serves_breakfast**, **serves_lunch**, **serves_dinner**

