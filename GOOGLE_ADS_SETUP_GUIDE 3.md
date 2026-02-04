# Google AdSense Multiplex Ads - Setup Guide

## ✅ Implementation Complete

**Multiplex ads** have been integrated into all major grid pages! They appear every 14 items (2 rows) as full-width sections showing multiple native ads in a grid format.

## What Are Multiplex Ads?

Multiplex ads display **multiple advertisements in a grid layout**, making them perfect for your card-based design. Instead of showing one ad card, they show 4-8 ads in a mini-grid section.

## Visual Layout

```
[Destination] [Destination] [Destination] [Destination] [Destination] [Destination] [Destination]
[Destination] [Destination] [Destination] [Destination] [Destination] [Destination] [Destination]
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ Sponsored                                                                                     │
│ [Ad 1]  [Ad 2]  [Ad 3]  [Ad 4]  [Ad 5]  [Ad 6]  ← Multiplex ads in grid                    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
[Destination] [Destination] [Destination] [Destination] [Destination] [Destination] [Destination]
```

## Current Status

**Placeholder Slot ID**: `1234567890` (needs to be replaced)

The ads are already implemented in:
- ✓ Homepage destination grid (`app/page.tsx`)
- ✓ City page destination grid (`app/city/[city]/page-client.tsx`)
- ✓ Cities page grid (`app/cities/page.tsx`)

## Next Steps

### 1. Create Multiplex Ad Unit in Google AdSense

1. Go to [Google AdSense Dashboard](https://www.google.com/adsense/)
2. Navigate to **Ads** → **By ad unit** → **Multiplex ads**
3. Click **New ad unit** → **Multiplex**
4. Configure your ad:
   - **Name**: "Urban Manual Multiplex"
   - **Size**: Responsive (recommended)
   - **Styling**: Keep minimal to match your design
5. Click **Save and get code**
6. Copy the **data-ad-slot** ID (looks like `1234567890`)

### 2. Replace Placeholder Slot IDs

Search for `'1234567890'` in these files and replace with your actual slot ID:

```bash
# Search command
grep -r "1234567890" app/
```

**Files to update:**
- `app/page.tsx` (line ~826)
- `app/city/[city]/page-client.tsx` (line ~265)
- `app/cities/page.tsx` (line ~211)

**Example replacement:**
```tsx
// Before
{ slot: '1234567890' }

// After (once you have your slot ID from AdSense)
{ slot: '9876543210' } // Your actual AdSense slot ID
```

### 3. Test in Development

Run your development server:
```bash
npm run dev
```

**Note**: Ads won't display in development. You'll see empty sections where ads should be. This is normal.

### 4. Deploy to Production

Once deployed, Google will review your site and start showing ads within 24-48 hours.

## Ad Placement Strategy

### Current Implementation
- **Frequency**: Every 14 items (approximately every 2 rows)
- **Full-width sections**: Ads take up entire row width
- **Grid integration**: Uses `col-span-full` to span all columns
- **Responsive**: Adapts to all screen sizes (2-7 columns)
- **Non-intrusive**: Ads never appear at the very end of lists

### Why Multiplex is Better

Compared to In-Feed ads (single card), Multiplex offers:
1. ✅ **More natural integration** - Appears as a featured section
2. ✅ **Higher revenue** - Multiple ads per placement
3. ✅ **Better for grids** - Designed specifically for card layouts
4. ✅ **More engaging** - Users see variety of options
5. ✅ **Less disruptive** - Full-width sections feel intentional

## Design Details

The `MultiplexAd` component creates ad sections that:
- Span the full width of the grid (`col-span-full`)
- Use minimal border (`border-gray-200 dark:border-gray-800`)
- Include subtle "Sponsored" label (`text-xs text-gray-400`)
- Match your rounded-2xl aesthetic
- Use subtle background (`bg-gray-50/50 dark:bg-gray-900/50`)
- Adapt to all responsive breakpoints

## Styling Code

```tsx
<div className="col-span-full">
  <div className="w-full border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/50">
    <div className="text-xs text-gray-400 mb-3 text-center">Sponsored</div>
    {/* Multiplex ad renders here */}
  </div>
</div>
```

## Monitoring Performance

After ads are live:
1. Check [AdSense Reports](https://www.google.com/adsense/reports)
2. Monitor:
   - Impressions per page
   - Click-through rate (CTR)
   - Revenue per thousand impressions (RPM)
   - Viewability percentage
3. Adjust placement if needed:
   - Increase frequency: Change `% 14` to `% 10` (more ads)
   - Decrease frequency: Change `% 14` to `% 21` (fewer ads)

## Troubleshooting

### Ads not showing
- Wait 24-48 hours after deployment
- Check AdSense account is approved
- Verify ads.txt is accessible at `yourdomain.com/ads.txt`
- Check browser console for errors
- Ensure `data-ad-format="autorelaxed"` is set

### Ads look bad
- Multiplex ads are designed by Google, you can't fully control appearance
- Try adjusting your wrapper styling if needed
- Reduce frequency if too prominent

### Revenue is low
- Multiplex typically generates more revenue than single ads
- Increase frequency: `% 14` → `% 10`
- Ensure ads.txt is properly configured
- Wait for optimization period (1-2 weeks)

### Ads too prominent
- Reduce frequency: `% 14` → `% 21`
- Remove background: Delete `bg-gray-50/50 dark:bg-gray-900/50`
- Make border subtler: Reduce padding `p-4` → `p-2`

## Optional: Different Ad Units Per Page

You can create separate Multiplex units for different pages to track performance:

```tsx
// Homepage - Higher value placement
{ slot: '1111111111' }

// City pages - Medium value
{ slot: '2222222222' }

// Cities page - Lower value
{ slot: '3333333333' }
```

This allows you to:
- Track which pages generate most revenue
- Optimize placement per page type
- A/B test different configurations

## Questions?

- [AdSense Multiplex Guide](https://support.google.com/adsense/answer/9183460)
- [AdSense Help Center](https://support.google.com/adsense)
- Review `GOOGLE_ADS_INTEGRATION.md` for component details
