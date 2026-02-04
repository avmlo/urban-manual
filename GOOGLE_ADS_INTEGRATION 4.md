# Google Ads Integration

## Setup Complete ✓

1. **ads.txt** created in `/public/ads.txt`
2. **AdSense script** added to root layout
3. **Ad components** created in `/components/GoogleAd.tsx`

## Publisher ID
```
google.com, pub-3052286230434362, DIRECT, f08c47fec0942fa0
```

## Ad Components

### 1. DisplayAd
Horizontal banner ad with minimal border matching design:
```tsx
import { DisplayAd } from '@/components/GoogleAd';

<DisplayAd slot="YOUR_AD_SLOT_ID" />
```

### 2. InFeedAd
Native ad that matches destination card grid:
```tsx
import { InFeedAd } from '@/components/GoogleAd';

<InFeedAd slot="YOUR_AD_SLOT_ID" />
```

### 3. GoogleAd (Base Component)
Custom ad with full control:
```tsx
import { GoogleAd } from '@/components/GoogleAd';

<GoogleAd
  slot="YOUR_AD_SLOT_ID"
  format="auto"
  responsive
/>
```

## Recommended Placement

### Homepage (app/page.tsx)
- **After search/filters, before grid**: DisplayAd (horizontal banner)
- **In destination grid**: InFeedAd every 14-21 items (2-3 rows)
- **Before pagination**: DisplayAd (horizontal banner)

### Individual Place Page (app/destination/[slug]/page-client.tsx)
- **After main image**: DisplayAd
- **After About section**: DisplayAd
- **In Similar Destinations grid**: InFeedAd (1-2 per section)

### City Page (app/city/[city]/page-client.tsx)
- **After filters, before grid**: DisplayAd
- **In destination grid**: InFeedAd every 14-21 items
- **Before pagination**: DisplayAd

### Cities Page (app/cities/page.tsx)
- **After country filters, before grid**: DisplayAd
- **In cities grid**: InFeedAd every 14 items

### Account Page (app/account/page.tsx)
- **Between tabs and content**: DisplayAd
- **In visited/saved grids**: InFeedAd every 12 items

## Design Principles

All ad components follow the homepage design language:
- **Borders**: `border-gray-200 dark:border-gray-800`
- **Rounded corners**: `rounded-2xl`
- **Text sizes**: `text-xs` for labels
- **Colors**: Minimal gray tones
- **Spacing**: Consistent with cards (`p-4`)

## Next Steps

1. **Create Ad Units** in Google AdSense dashboard
2. **Get Slot IDs** for each ad type
3. **Add ads to pages** using the recommended placements above
4. **Test** in development and production
5. **Monitor** performance in AdSense dashboard

## Important Notes

- Ads will only show in production when domain is verified
- Use Auto ads feature for initial testing
- Follow Google's ad placement policies
- Keep ad density reasonable (no more than 1 ad per screen height)
- InFeedAds should not exceed 20% of grid items
