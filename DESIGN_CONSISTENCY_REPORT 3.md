# Design Consistency Report

## Current Design System

### ✅ Consistent Elements:

**Header (Header.tsx)**
- Background: White with dark mode support
- Border: `border-gray-200 dark:border-gray-800`
- Typography: `text-xs font-bold uppercase` for navigation
- Title: Large responsive text `clamp(24px,5vw,48px)`
- Hover: `hover:opacity-60 transition-opacity`
- Dark mode: Fully supported

**Footer (SimpleFooter.tsx)**
- Background: Matches header
- Border: `border-gray-200 dark:border-gray-800`
- Typography: `text-xs font-bold uppercase`
- Hover: Same as header
- Dark mode: Fully supported

**Destination Cards (DestinationCard.tsx)**
- Layout: Square aspect ratio
- Image: `group-hover:scale-105` zoom effect
- Typography: `text-sm font-medium` for title, `text-xs` for location
- Colors: `text-black dark:text-white` with opacity variations
- Dark mode: Fully supported

### ⚠️ Inconsistent Elements:

**Stats Page (Stats.tsx)**
- Uses dark theme by default (`bg-black`)
- Different color scheme: Gradients, vibrant colors
- Typography: Different sizes and weights
- **Issue**: Doesn't match the minimal, clean aesthetic of other pages

**Potential Issues:**
1. Stats page has its own design language (dark, gamified)
2. Some pages may use different button styles
3. Form inputs might not be consistent across pages
4. Modal/drawer designs may vary

## Recommended Fixes:

### 1. **Standardize Stats Page**
- Remove dark background, use white/light like other pages
- Use consistent typography (text-xs, text-sm, font-bold)
- Match card styles with destination cards
- Keep hover:opacity-60 pattern

### 2. **Create Design Tokens**
```css
/* Colors */
--color-bg: white
--color-border: #e5e7eb (gray-200)
--color-text-primary: black
--color-text-secondary: rgba(0,0,0,0.6)

/* Typography */
--text-xs: 0.75rem (12px)
--text-sm: 0.875rem (14px)
--text-base: 1rem (16px)
--font-bold: 700
--uppercase: uppercase

/* Spacing */
--spacing-unit: 4px
--max-width: 1920px
--padding-x: 2.5rem (40px)
```

### 3. **Component Patterns to Follow**
- All buttons: `text-xs font-bold uppercase hover:opacity-60`
- All borders: `border-gray-200 dark:border-gray-800`
- All cards: Square images, minimal text, hover scale
- All navigation: Uppercase, bold, small text

## Action Items:

1. ✅ Header - Already consistent
2. ✅ Footer - Already consistent
3. ✅ Destination Cards - Already consistent
4. ❌ **Stats Page** - Needs redesign to match
5. ❓ Account Page - Need to review
6. ❓ Other pages - Need full audit

Would you like me to:
A) Fix the Stats page to match the design system
B) Do a full audit of all pages
C) Create a design system document with all patterns

