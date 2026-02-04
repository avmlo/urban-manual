# Lovably-Inspired Design Plan for Urban Manual

Based on [Lovably's design](https://www.lovably.com), here's a comprehensive plan to refine the Urban Manual destination drawer and overall design aesthetic.

## Design Principles from Lovably

1. **Minimalism & Clean Lines**: Maximum white space, minimal decorative elements
2. **Typography Hierarchy**: Clear, elegant typography with proper weight and spacing
3. **Square Image Cards**: Consistent 1:1 aspect ratio for all images
4. **Content First**: Let content shine, reduce UI chrome
5. **Subtle Interactions**: Clean hover states, minimal animations
6. **Grid Perfection**: Clean, consistent grid layouts

---

## Phase 1: Destination Drawer Refinement

### 1.1 Header Simplification
**Current**: Header with "Destination" title and multiple buttons
**Target**: Minimal header like Lovably's clean navigation

**Changes**:
- Remove "Destination" title (redundant - content is clear)
- Simplify close button to just an X icon
- Remove external link button from header (move to content area if needed)
- Reduce padding and make header more minimal
- Consider removing sticky header or making it more subtle

### 1.2 Typography Refinement
**Current**: Mixed font sizes and weights
**Target**: Clear hierarchy with consistent spacing

**Changes**:
- Title: Larger, bolder, more breathing room
- Meta information: Smaller, lighter, more subtle
- Section headers: Uppercase, tracked, minimal (already done for ADDRESS/HOURS)
- Body text: Better line-height and spacing

### 1.3 Content Layout
**Current**: Good structure but could be cleaner
**Target**: More white space, better visual flow

**Changes**:
- ✅ **DONE**: Square image aspect ratio
- ✅ **DONE**: Address and Hours side-by-side with uppercase labels
- Increase spacing between sections (more breathing room)
- Simplify tag/badge styling (less colorful, more minimal)
- Reduce visual weight of rating/price displays

### 1.4 Action Buttons
**Current**: Multiple buttons with various styles
**Target**: Clean, minimal button design

**Changes**:
- Simplify button styles (less borders, more subtle)
- Better spacing between action buttons
- Consider grouping related actions
- Remove unnecessary visual elements

---

## Phase 2: Grid Layout Improvements

### 2.1 Homepage Grid
**Current**: Responsive grid with various column counts
**Target**: Cleaner grid with consistent spacing

**Changes**:
- Ensure all destination cards are square (1:1 aspect ratio)
- Consistent gap spacing (already good)
- Remove or simplify card borders (lighter, more minimal)
- Cleaner hover states (subtle, not dramatic)

### 2.2 Card Design
**Current**: Cards with borders, badges, hover effects
**Target**: Minimal cards that let images shine

**Changes**:
- Lighter borders or borderless with subtle shadow
- Simplify badge overlays (Michelin stars, visited indicators)
- Cleaner typography on cards
- More subtle hover states

---

## Phase 3: Overall Site Refinement

### 3.1 Navigation
**Current**: Standard header navigation
**Target**: Minimal navigation like Lovably

**Changes**:
- Simplify header (less visual weight)
- Cleaner menu items
- Better spacing and typography

### 3.2 Color Palette
**Current**: Various colors for different elements
**Target**: More restrained palette

**Changes**:
- Reduce use of purple/colorful tags
- More grayscale with selective color accents
- Ensure dark mode maintains same minimal aesthetic

### 3.3 Spacing & Layout
**Current**: Good but could be more generous
**Target**: More white space throughout

**Changes**:
- Increase padding/margins in key areas
- Better section spacing
- More breathing room around content

---

## Implementation Priority

### High Priority (Immediate)
1. ✅ Square image aspect ratio in drawer
2. ✅ Address/Hours side-by-side layout
3. Simplify drawer header
4. Refine typography hierarchy
5. Increase spacing in drawer

### Medium Priority (Next Sprint)
6. Simplify action buttons
7. Refine card grid design
8. Clean up tag/badge styling
9. Improve overall spacing

### Low Priority (Future)
10. Navigation simplification
11. Color palette refinement
12. Advanced animations/interactions

---

## Specific Code Changes Needed

### DestinationDrawer.tsx
1. **Header Simplification**:
   ```tsx
   // Remove "Destination" title
   // Simplify to just close button
   <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-end z-10">
     <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
       <X className="h-5 w-5" />
     </button>
   </div>
   ```

2. **Typography Refinement**:
   - Increase title size and weight
   - Make meta info more subtle
   - Better spacing between elements

3. **Spacing Improvements**:
   - Increase `mb-6` to `mb-8` or `mb-10` for major sections
   - Add more padding between related elements
   - More generous margins around content

4. **Button Simplification**:
   - Remove heavy borders
   - More subtle hover states
   - Better grouping

### Homepage Grid (app/page.tsx)
1. **Card Styling**:
   - Lighter borders
   - Ensure square aspect ratio
   - Cleaner badge overlays

2. **Spacing**:
   - Consistent gaps
   - Better padding

---

## Design Tokens to Define

```css
/* Spacing Scale */
--space-xs: 0.5rem;   /* 8px */
--space-sm: 0.75rem;  /* 12px */
--space-md: 1rem;     /* 16px */
--space-lg: 1.5rem;   /* 24px */
--space-xl: 2rem;     /* 32px */
--space-2xl: 3rem;    /* 48px */
--space-3xl: 4rem;   /* 64px */

/* Typography Scale */
--text-xs: 0.75rem;   /* 12px */
--text-sm: 0.875rem;  /* 14px */
--text-base: 1rem;    /* 16px */
--text-lg: 1.125rem;  /* 18px */
--text-xl: 1.25rem;   /* 20px */
--text-2xl: 1.5rem;   /* 24px */
--text-3xl: 1.875rem; /* 30px */
--text-4xl: 2.25rem;  /* 36px */

/* Border Radius */
--radius-sm: 0.25rem;  /* 4px */
--radius-md: 0.5rem;   /* 8px */
--radius-lg: 0.75rem;  /* 12px */
--radius-xl: 1rem;     /* 16px */
```

---

## Success Metrics

- [ ] Drawer feels more spacious and breathable
- [ ] Typography hierarchy is clearer
- [ ] Images are consistently square
- [ ] Overall design feels more minimal and refined
- [ ] Dark mode maintains same aesthetic
- [ ] Mobile experience is clean and simple

---

## Next Steps

1. Start with drawer header simplification
2. Refine typography and spacing
3. Simplify action buttons
4. Test on mobile and desktop
5. Iterate based on feedback
