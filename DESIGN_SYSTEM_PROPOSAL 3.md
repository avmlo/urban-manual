# Urban Manual Design System Proposal

## Design Philosophy
**Editorial Minimalism** - Clean, typography-focused, content-first design inspired by high-end travel magazines and editorial publications.

---

## 1. Color Palette

### Light Mode (Primary)
```
Background:     #FFFFFF (white)
Surface:        #FAFAFA (off-white for cards)
Border:         #E5E7EB (gray-200)
Text Primary:   #000000 (black)
Text Secondary: rgba(0, 0, 0, 0.6) (60% opacity)
Text Tertiary:  rgba(0, 0, 0, 0.3) (30% opacity)
Accent:         #000000 (black for buttons/CTAs)
```

### Dark Mode
```
Background:     #0A0A0A (near black)
Surface:        #1A1A1A (dark gray)
Border:         #2A2A2A (gray-800)
Text Primary:   #FFFFFF (white)
Text Secondary: rgba(255, 255, 255, 0.6)
Text Tertiary:  rgba(255, 255, 255, 0.3)
Accent:         #FFFFFF (white for buttons/CTAs)
```

### Semantic Colors
```
Success:        #10B981 (green-500) - for saved items
Warning:        #F59E0B (amber-500) - for notifications
Error:          #EF4444 (red-500) - for errors
Info:           #3B82F6 (blue-500) - for info badges
```

---

## 2. Typography

### Font Family
```
Primary: System UI Stack
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

### Type Scale
```
Display:    clamp(32px, 5vw, 48px) - Page titles
Heading 1:  24px (1.5rem) - Section headers
Heading 2:  18px (1.125rem) - Subsections
Body:       14px (0.875rem) - Regular text
Small:      12px (0.75rem) - Navigation, labels
Tiny:       10px (0.625rem) - Metadata
```

### Font Weights
```
Normal:     400 - Body text
Medium:     500 - Card titles
Bold:       700 - Navigation, buttons, headers
```

### Text Styles
```
Navigation:     text-xs font-bold uppercase
Card Title:     text-sm font-medium
Card Subtitle:  text-xs opacity-60
Section Header: text-xs font-bold uppercase
Body Text:      text-sm font-normal
```

---

## 3. Spacing System

### Base Unit: 4px
```
xs:   4px   (1 unit)
sm:   8px   (2 units)
md:   16px  (4 units)
lg:   24px  (6 units)
xl:   32px  (8 units)
2xl:  48px  (12 units)
3xl:  64px  (16 units)
```

### Layout Spacing
```
Page Padding:       px-6 md:px-10 (24px mobile, 40px desktop)
Max Width:          max-w-[1920px]
Section Spacing:    py-12 (48px vertical)
Card Gap:           gap-4 md:gap-6 (16px-24px)
Element Gap:        gap-2 to gap-4 (8px-16px)
```

---

## 4. Components

### Buttons
```css
Primary Button:
- bg-black text-white dark:bg-white dark:text-black
- px-4 py-2 rounded-lg
- text-xs font-bold uppercase
- hover:opacity-60 transition-opacity

Secondary Button:
- border border-gray-200 dark:border-gray-800
- px-4 py-2 rounded-lg
- text-xs font-bold uppercase
- hover:opacity-60 transition-opacity

Text Button:
- text-xs font-bold uppercase
- hover:opacity-60 transition-opacity
```

### Cards
```css
Destination Card:
- aspect-square image
- overflow-hidden
- group hover:opacity-80
- image: group-hover:scale-105 transition-transform duration-500
- text: py-3 space-y-0.5
- title: text-sm font-medium
- subtitle: text-xs opacity-60
```

### Inputs
```css
Text Input:
- border border-gray-200 dark:border-gray-800
- px-4 py-3 rounded-lg
- text-sm
- focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white
- bg-white dark:bg-gray-900
```

### Navigation
```css
Header:
- border-b border-gray-200 dark:border-gray-800
- Two-tier: Title bar + Navigation bar
- Title: clamp(24px, 5vw, 48px) font-bold uppercase
- Nav items: text-xs font-bold uppercase gap-6
- Height: auto (title) + h-12 (nav bar)
```

### Footer
```css
Footer:
- border-t border-gray-200 dark:border-gray-800
- py-8 px-6 md:px-10
- flex justify-between items-center
- text-xs font-bold uppercase
- Links: hover:opacity-60
```

---

## 5. Interaction Patterns

### Hover States
```
All interactive elements: hover:opacity-60 transition-opacity
Images in cards: hover:scale-105 transition-transform duration-500
```

### Transitions
```
Standard: transition-opacity duration-200
Slow: transition-transform duration-500
```

### Animations
```
Fade in: animate-in fade-in duration-300
Slide in: animate-in slide-in-from-bottom-4 duration-300
```

---

## 6. Layout Patterns

### Grid Systems
```
Destination Grid:
- grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7
- gap-4 md:gap-6

Content Grid:
- grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- gap-6 md:gap-8
```

### Container
```
max-w-[1920px] mx-auto px-6 md:px-10
```

---

## 7. Special Components

### Stats Cards (Redesigned to match system)
```css
Stats Card:
- bg-white dark:bg-gray-900
- border border-gray-200 dark:border-gray-800
- p-6 rounded-lg
- hover:opacity-80 transition-opacity
- Number: text-2xl font-bold
- Label: text-xs font-bold uppercase opacity-60
```

### Badges
```css
Badge:
- px-2.5 py-1 rounded-full
- text-xs font-bold uppercase
- bg-black text-white dark:bg-white dark:text-black
```

### Dividers
```css
border-t border-gray-200 dark:border-gray-800
```

---

## 8. Dark Mode Strategy

**Approach**: Invert colors, maintain contrast
- All components support dark mode via Tailwind's `dark:` prefix
- Toggle in header with DarkModeToggle component
- Persistent via localStorage

---

## 9. Responsive Breakpoints

```
sm:   640px   - Small tablets
md:   768px   - Tablets
lg:   1024px  - Small laptops
xl:   1280px  - Laptops
2xl:  1536px  - Large screens
```

---

## 10. Implementation Checklist

### Phase 1: Foundation
- [ ] Update Stats page to match design system
- [ ] Standardize all button styles
- [ ] Ensure all inputs use same styling
- [ ] Verify dark mode consistency

### Phase 2: Components
- [ ] Create reusable Button component
- [ ] Create reusable Card component
- [ ] Create reusable Input component
- [ ] Create Badge component

### Phase 3: Pages
- [ ] Audit and fix Home page
- [ ] Audit and fix Account page
- [ ] Audit and fix Explore page
- [ ] Audit and fix all other pages

### Phase 4: Polish
- [ ] Add consistent loading states
- [ ] Add consistent empty states
- [ ] Add consistent error states
- [ ] Test all interactions

---

## Key Principles

1. **Consistency Over Novelty** - Use established patterns everywhere
2. **Content First** - Let images and text shine, minimal UI chrome
3. **Performance** - Fast transitions, optimized images
4. **Accessibility** - High contrast, clear focus states, semantic HTML
5. **Responsive** - Mobile-first, graceful scaling

---

## Examples of Changes Needed

### Stats Page (Current vs Proposed)

**Current:**
```tsx
<div className="bg-black text-white">
  <div className="bg-gradient-to-r from-purple-500 to-blue-500">
    <h1 className="text-4xl">Level 5</h1>
  </div>
</div>
```

**Proposed:**
```tsx
<div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
  <div className="p-6">
    <div className="text-xs font-bold uppercase opacity-60 mb-2">Level</div>
    <h1 className="text-2xl font-bold">5</h1>
  </div>
</div>
```

---

## Approval Needed

Please review and approve:
1. ✅ Color palette (minimal black/white with subtle grays)
2. ✅ Typography (system fonts, uppercase navigation)
3. ✅ Spacing (consistent 4px base unit)
4. ✅ Components (minimal, editorial style)
5. ✅ Interaction patterns (opacity hover, scale images)

**Once approved, I will:**
1. Update Stats page to match
2. Create reusable component library
3. Audit and fix all pages
4. Document all patterns for future development

