# Feature Redesign Plan - Urban Manual

**Date**: January 31, 2026
**Branch**: `claude/plan-feature-redesign-EPjAE`
**Based on**: Design Audit (Dec 2025), DESIGN_SYSTEM.md, recent commit history

---

## Current State Summary

The design system is well-documented (DESIGN_SYSTEM.md, 501 lines) but inconsistently enforced. The Dec 2025 audit scored implementation consistency at **4/10** despite tokens being defined at **9/10**. Two visual languages coexist: a minimalist monochromatic system (primary) and a warm editorial palette (secondary, underutilized). Recent work added dark mode and admin UI improvements.

---

## Redesign Options

Below are **six independent redesign tracks**, ordered by impact. Each can be pursued separately or combined.

---

### Option A: Unify the Dual Color System

**Problem**: Two separate color palettes (monochromatic black/white + warm editorial terracotta/cream) are defined but applied inconsistently. Most pages use the monochromatic palette while editorial styles sit unused.

**Scope**: ~75 component files, `styles/tokens.css`, `globals.css`, `DESIGN_SYSTEM.md`

**Approach**:

1. **Choose a direction** (one of):
   - **A1 - Editorial Everywhere**: Adopt the warm cream/terracotta as the primary palette site-wide. Black/white becomes the admin palette only. This gives the travel guide a distinct, premium feel.
   - **A2 - Monochrome Primary, Editorial Accents**: Keep black/white as the base. Use the editorial palette only for destination detail pages, trip pages, and content-heavy views. Clear rule: editorial palette = content pages, monochrome = navigation/tools.
   - **A3 - Merge into One**: Create a single unified palette that blends both. Warm neutrals replace pure gray (e.g., `gray-200` becomes a warm gray `#E5E0D8`). Terracotta becomes the sole accent color replacing arbitrary blue/green usage.

2. **Implementation**:
   - Consolidate CSS variables in `tokens.css` to one set (not two parallel systems)
   - Update `DESIGN_SYSTEM.md` to reflect the chosen direction
   - Migrate components file-by-file, starting with highest-traffic pages

**Files to change**: `styles/tokens.css`, `app/globals.css`, `lib/drawer-styles.ts`, `components/CardStyles.ts`, plus ~75 component files

**Risk**: Medium - Visual regression across pages. Requires thorough QA.

---

### Option B: Typography Consolidation

**Problem**: Four font families loaded (Inter, Instrument Serif, Playfair Display, Source Serif 4). Editorial typography classes (`.text-editorial-headline`, `.text-editorial-body`) are defined but rarely used. The audit found 823+ hardcoded arbitrary font sizes across the codebase.

**Scope**: 150+ component files, font loading, `globals.css`

**Approach**:

1. **Reduce to two fonts**:
   - **Body**: Inter (keep as-is, already dominant)
   - **Display**: Pick ONE serif - Instrument Serif or Source Serif 4 (not both + Playfair)
   - Remove unused font imports to reduce page weight

2. **Enforce the type scale**:
   - Map all remaining hardcoded sizes to standard Tailwind classes
   - Add a custom `text-2xs` (10px) to the Tailwind config for the few places that genuinely need sub-12px text
   - Add ESLint rule or Tailwind plugin to flag `text-[*px]` patterns

3. **Activate editorial typography classes**:
   - Use `.text-editorial-headline` on all destination/city page headings
   - Use `.text-editorial-body` on all long-form content
   - Use `.text-editorial-label` on all category/meta labels

**Priority files** (from audit):
| File | Hardcoded sizes |
|------|----------------|
| `src/features/shared/components/DestinationContent.tsx` | 42 |
| `app/trips/[id]/page.tsx` | 34 |
| `src/features/homepage/components/InteractiveHero.tsx` | 17 |
| `src/features/detail/DestinationDrawer.tsx` | 14+ |

**Risk**: Low-Medium - Mostly mechanical find/replace with visual spot-checking.

---

### Option C: Component Pattern Standardization

**Problem**: 61 UI components use four different styling approaches (CVA, manual size objects, inline `cn()` calls, monolithic class strings). Component file naming is inconsistent (PascalCase vs kebab-case). Some components in `/src/ui/` overlap with custom components in `/components/`.

**Scope**: 61 UI components, ~30 feature components

**Approach**:

1. **Standardize on CVA** (Class Variance Authority) for all components with variants:
   - Migrate `input.tsx`, `textarea.tsx`, `dialog.tsx` from monolithic strings to CVA
   - Create variant definitions for size (`sm`, `md`, `lg`) and visual style

2. **Consolidate overlapping components**:
   - Audit `/src/ui/` vs `/components/` for duplicates
   - Pick one location per component, re-export from the other if needed for compatibility
   - Document which directory is for base primitives vs feature components

3. **Standardize file naming**:
   - All UI primitives: `kebab-case.tsx` (matches shadcn/ui convention)
   - All feature components: `PascalCase.tsx`
   - Rename inconsistent files in a single batch commit

4. **Create a component index**:
   - Add a `src/ui/index.ts` barrel export for discoverability
   - Document when to use each component in a component catalog

**Risk**: Low - Mostly refactoring without visual changes. File renames need import updates.

---

### Option D: Spacing System Enforcement

**Problem**: No consistent spacing scale enforced. Fractional values (`gap-1.5`, `p-2.5`, `p-3.5`) used alongside standard scale. Responsive scaling ratios vary within the same page (1.5x vs 1.25x jumps).

**Scope**: ~100 component files, `DESIGN_SYSTEM.md`

**Approach**:

1. **Adopt a strict spacing scale** (powers of 2, matching design tokens):
   ```
   4px  (1)   - Tight: icon gaps, inline spacing
   8px  (2)   - Small: list item gaps, compact padding
   16px (4)   - Medium: card padding, section gaps
   24px (6)   - Large: section padding
   32px (8)   - XL: page section spacing
   48px (12)  - 2XL: major page divisions
   ```

2. **Eliminate intermediate values**:
   - Replace `gap-3` (12px) with `gap-2` (8px) or `gap-4` (16px) depending on context
   - Replace `gap-5` (20px) with `gap-4` (16px) or `gap-6` (24px)
   - Replace fractional values (`p-1.5`, `p-2.5`) with nearest standard value

3. **Standardize responsive scaling**:
   - Document a single scaling ratio (e.g., 1.5x from mobile to desktop)
   - Create responsive spacing utilities if needed

4. **Add to lint rules**:
   - Flag non-standard spacing values in PR reviews

**Priority files** (from audit):
- `app/privacy/page.tsx` - mixed scaling ratios
- `components/RelatedDestinations.tsx` - `space-y-12` and `space-y-0.5` adjacent
- `components/LoadingStates.tsx` - four different gap values for similar skeletons

**Risk**: Low - Small visual shifts that improve consistency.

---

### Option E: Animation Rationalization

**Problem**: 30+ custom animations defined in `globals.css`, some duplicated. Motion preferences not consistently respected. Christmas theme animations (150+ lines) embedded in main stylesheet.

**Scope**: `app/globals.css`, animation-using components

**Approach**:

1. **Reduce to 10 core animations**:
   | Animation | Purpose | Keep/Remove |
   |-----------|---------|-------------|
   | `fadeIn` | Content appearance | Keep (deduplicate) |
   | `slideUp` | Drawer/modal entry | Keep |
   | `slideInRight` | Navigation transitions | Keep |
   | `scaleIn` | Popover/tooltip entry | Keep |
   | `shimmer` | Loading states | Keep (deduplicate) |
   | `spin` | Loading spinner | Keep (Tailwind built-in) |
   | `pulse` | Skeleton loading | Keep (Tailwind built-in) |
   | `highlightPulse` | Trip item highlight | Keep |
   | `breathingDot` | Live indicators | Keep |
   | `shake` | Error feedback | Keep |
   | `gentleBounce` | Remove (subtle, rarely noticed) |
   | `scalePulse` | Remove (merge with scaleIn) |
   | `twinkle` | Move to christmas.css |
   | `saveGlow` | Remove (simplify to opacity transition) |

2. **Extract seasonal themes**:
   - Move all Christmas animations/styles to `styles/christmas.css`
   - Load conditionally via `ChristmasThemeContext`

3. **Ensure `prefers-reduced-motion`**:
   - Wrap all custom animations in `@media (prefers-reduced-motion: no-preference)`
   - Provide instant/opacity-only fallbacks

**Risk**: Low - Mostly CSS cleanup.

---

### Option F: Homepage & Destination Card Redesign

**Problem**: The homepage (`app/page.tsx`, ~130KB) is the highest-traffic page but uses a dense grid of cards that blend together. Card styles are defined in `CardStyles.ts` but the implementation has drifted.

**Scope**: `app/page.tsx`, `components/CardStyles.ts`, card-related components

**Approach**:

1. **Card visual refresh**:
   - **Option F1 - Magazine Layout**: Replace uniform grid with a masonry/editorial layout. Feature 2-3 "hero" destinations at larger sizes, interspersed with standard cards. Adds visual hierarchy.
   - **Option F2 - Hover-Rich Cards**: Keep the grid but add richer hover states: image zoom, quick-info overlay (category, rating, city), save button reveal. More interactive without layout changes.
   - **Option F3 - Category Sections**: Group destinations by category (restaurants, hotels, bars) with horizontal scroll carousels per section. More structured browsing.

2. **Card component cleanup**:
   - Ensure all card instances use `CardStyles.ts` constants (currently some bypass them)
   - Add consistent image aspect ratios (currently mixed `aspect-square` and `aspect-video`)
   - Standardize the metadata row (icon + text patterns)

3. **Performance**:
   - Implement virtualized scrolling for the grid (900+ destinations)
   - Use `content-visibility: auto` for off-screen cards
   - Lazy-load images below the fold

**Risk**: Medium-High - Homepage is 130KB and complex. Changes need careful testing.

---

## Recommended Sequencing

Based on impact, risk, and dependencies:

| Phase | Track | Rationale |
|-------|-------|-----------|
| **Phase 1** | **B: Typography** | Lowest risk, highest audit score improvement. Mechanical changes. |
| **Phase 2** | **D: Spacing** | Also mechanical, compounds with typography for immediate visual polish. |
| **Phase 3** | **A: Color Unification** | Biggest visual impact. Do after typography/spacing so there's less noise. |
| **Phase 4** | **E: Animations** | Quick CSS cleanup, can happen in parallel with Phase 3. |
| **Phase 5** | **C: Components** | Structural refactor, best done after visual decisions are settled. |
| **Phase 6** | **F: Homepage Cards** | Most complex, benefits from all prior phases being complete. |

---

## Decision Points

Before starting implementation, these decisions need to be made:

1. **Color direction**: A1 (editorial everywhere), A2 (editorial for content only), or A3 (merged palette)?
2. **Display serif font**: Instrument Serif or Source Serif 4? (Drop the other + Playfair)
3. **Homepage layout**: F1 (magazine), F2 (hover-rich), or F3 (category sections)?
4. **Spacing strictness**: Hard enforcement (lint rules) or soft guidance (documentation only)?

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Design token usage in components | 5/10 | 8/10 |
| Implementation consistency | 4/10 | 8/10 |
| Hardcoded font sizes | 823+ | < 20 |
| Font families loaded | 4 | 2 |
| Custom animations | 30+ | 10 |
| Accessibility compliance | 6/10 | 8/10 |

---

## Files Reference

Key files that will be touched across all redesign tracks:

| File | Tracks |
|------|--------|
| `styles/tokens.css` | A, B, D |
| `app/globals.css` | A, B, E |
| `DESIGN_SYSTEM.md` | All |
| `components/CardStyles.ts` | A, F |
| `lib/drawer-styles.ts` | A |
| `tailwind.config.js` | B, D |
| `src/features/shared/components/DestinationContent.tsx` | B, D |
| `app/trips/[id]/page.tsx` | B, D |
| `src/features/homepage/components/InteractiveHero.tsx` | B, F |
| `app/page.tsx` | F |
| `src/ui/*.tsx` | C |

---

## Design Element Redesign Options

Below are detailed, component-level redesign options for specific UI elements: buttons, overlays, navigation, form controls, interactions, and micro-animations.

---

### G: Button System Overhaul

**Current state**: 8 variants in the base `Button` component, plus 6 standalone button components (`UMPillButton`, `AuthButton`, `FollowButton`, `FollowCityButton`, `FilterButton`, `AddToTripButton`). **90% of buttons (1,089 of ~1,200) are inline `<button>` elements** that bypass the component entirely. 10+ different hover patterns coexist (`hover:opacity-80`, `hover:opacity-90`, `hover:bg-gray-50`, `hover:bg-gray-100`, `hover:bg-stone-100`, etc.). Transition durations vary: 150ms, 180ms, 200ms, 300ms.

**Redesign options**:

#### G1 - Consolidate to One Button Component
Merge all 6 standalone button components into the base `Button` via new CVA variants. Migrate the 1,089 inline buttons to use `<Button>`.

- Add variants: `auth`, `filter`, `pill`, `follow`, `fab` to the base component
- Standardize hover to ONE pattern per variant type:
  - **Solid buttons**: `active:scale-[0.98]` + `hover:opacity-90` (press feedback)
  - **Ghost/outline buttons**: `hover:bg-[var(--um-bg-secondary)]` (background shift)
  - **Icon buttons**: `hover:opacity-80` (simple opacity)
- Lock transition duration to `200ms` across all buttons
- Add consistent focus ring: `focus-visible:ring-2 focus-visible:ring-offset-2`

**Scope**: `src/ui/button.tsx`, 6 standalone components, ~1,089 inline buttons across the codebase
**Risk**: High (volume of changes), but each change is mechanical

#### G2 - Interaction-Rich Buttons
Keep current component structure but add richer micro-interactions:

- **Ripple effect** on primary buttons (Material-style touch feedback)
- **Icon morph** on toggle buttons (heart outline → filled with spring animation)
- **Loading shimmer** replacing spinner (inline skeleton over button text)
- **Success flash** after action completion (brief green tint, 300ms)
- **Haptic feedback** via `NativeExperienceProvider` on mobile tap

**Scope**: `src/ui/button.tsx`, `hooks/useMobileUX.ts`
**Risk**: Low - Additive changes, no existing behavior removed

#### G3 - Contextual Button Styles
Buttons adapt style based on their container context:

- **On images/cards**: Semi-transparent glass morphism (`bg-white/80 backdrop-blur-sm`)
- **In drawers**: Match drawer's editorial palette automatically
- **In forms**: Subdued until form is dirty, then animate to full prominence
- **In admin**: Compact, no rounded-full, tighter padding

**Scope**: `src/ui/button.tsx` (add context-aware variant), container components
**Risk**: Medium - Requires context detection logic

---

### H: Drawer & Overlay Redesign

**Current state**: Custom `Drawer.tsx` (384 lines) with gesture support sits alongside Radix-based `Sheet`, `Dialog`, `AlertDialog`. Animation timings differ: Drawer uses 500ms with `cubic-bezier(0.32, 0.72, 0, 1)`, Dialog uses 200ms with `ease-in-out`, Sheet uses 300ms/500ms. Z-index conflicts: Dialog sits at `z-[70]` while Drawer is `z-50`. Duplicate `DrawerContext` exists in two locations. Mobile safe area handling is inconsistent.

**Redesign options**:

#### H1 - Unified Overlay System
Replace the parallel Drawer/Sheet/Dialog implementations with a single configurable overlay component:

- One component: `<Overlay mode="drawer|sheet|dialog|alert" />`
- Single animation curve: `cubic-bezier(0.32, 0.72, 0, 1)` for all overlays
- Standardized durations: 300ms (small overlays), 400ms (drawers/sheets)
- Unified z-index scale: `40` (backdrop), `50` (primary overlay), `60` (nested overlay)
- Single state management: Merge `DrawerContext` + `drawer-store.ts` into one store
- Delete the duplicate `src/domain/contexts/DrawerContext.tsx`

**Scope**: `src/ui/Drawer.tsx`, `src/ui/sheet.tsx`, `src/ui/dialog.tsx`, `contexts/DrawerContext.tsx`, `lib/stores/drawer-store.ts`
**Risk**: High - Core interaction pattern, needs thorough testing

#### H2 - Enhanced Drawer Gestures
Keep current architecture but add richer mobile interactions:

- **Edge swipe to open** (not just close) - swipe from right edge opens last-used drawer
- **Stacked drawers** with visible peek of parent (offset 20px left, dimmed)
- **Snap points** for bottom sheet: 25% (peek), 50% (half), 96% (full)
- **Magnetic edges** - drawer snaps to nearest point when released
- **Backdrop blur** instead of solid black overlay (iOS-style)
- **Drawer-to-page transition** - expand drawer to become a full page with shared element animation

**Scope**: `src/ui/Drawer.tsx`, `hooks/useMobileUX.ts`
**Risk**: Medium - Gesture code is complex but isolated

#### H3 - Drawer Visual Refresh
Keep behavior, refresh the visual treatment:

- **Rounded handle bar** with subtle shadow (currently 40px x 1.5px, make 48px x 4px)
- **Content fade-in** staggered as drawer opens (title first, then content, then actions)
- **Frosted glass header** that becomes opaque on scroll
- **Floating action bar** at bottom with shadow gradient (replace current sticky bar)
- **Themed drawers** - destination drawers use destination's dominant image color as accent

**Scope**: `src/ui/Drawer.tsx`, `src/ui/DrawerActionBar.tsx`, `src/ui/DrawerHeader.tsx`
**Risk**: Low - Visual-only changes

---

### I: Navigation & Header Redesign

**Current state**: Header is `relative` positioned (not sticky), uses `z-30`. Navigation is minimal: logo left, 2-3 action buttons right. No persistent category/city navigation. Mobile has swipe-back gesture but no bottom tab bar. Command palette (Cmd+K) exists but is not discoverable on mobile. Footer has an expandable sitemap that's rarely needed.

**Redesign options**:

#### I1 - Sticky Header with Progressive Disclosure
- **Sticky header** that shrinks on scroll (full height → compact)
- **Search bar** appears in header on scroll-down (currently buried in page)
- **Category pills** slide in below header when browsing destinations
- **Breadcrumb trail** replaces logo text on inner pages
- **Auto-hide on scroll-down, reveal on scroll-up** (iOS Safari-style)

**Scope**: `components/Header.tsx`, `app/layout.tsx`, new scroll hook
**Risk**: Medium - Scroll behavior needs performance tuning

#### I2 - Mobile Bottom Tab Bar
Add a persistent bottom navigation bar on mobile:

- **5 tabs**: Home, Explore/Search, Map, Trips, Account
- **Active indicator**: Dot or pill underline (not icon fill change)
- **Haptic feedback** on tab switch
- **Safe area aware** with `pb-[env(safe-area-inset-bottom)]`
- **Hide on scroll-down**, reveal on scroll-up or tap
- **Badge indicators**: Unread count on trips, unsaved changes

**Scope**: New `components/BottomTabBar.tsx`, `app/layout.tsx`, `hooks/useMobileUX.ts`
**Risk**: Medium - New component, but well-defined pattern

#### I3 - Command Palette as Primary Navigation
Elevate the command palette from power-user feature to primary navigation:

- **Always-visible search icon** in header (not just Cmd+K)
- **Recent destinations** shown on open (personalized)
- **AI suggestions** inline ("Try: best coffee in Tokyo")
- **Quick actions**: Save place, start trip, toggle dark mode
- **Keyboard-first** with full arrow-key navigation
- **Mobile**: Full-screen search overlay with large touch targets

**Scope**: `components/CommandPalette.tsx`, `components/Header.tsx`
**Risk**: Low-Medium - Extends existing component

---

### J: Form Controls & Input Redesign

**Current state**: `FormField` component has real-time validation with color-coded borders (red/green). `SearchableSelect` supports keyboard and custom values. `PasswordField` has strength meter. Switch/Checkbox are Radix-based. Input has a monolithic 200+ character class string. No standardized error animation.

**Redesign options**:

#### J1 - Floating Label Inputs
Replace static labels with animated floating labels:

- **Label starts inside** the input as placeholder
- **Floats up and shrinks** on focus or when value exists
- **Color transitions**: gray (idle) → black (focused) → red (error) → green (valid)
- **Consistent 200ms** transition for all state changes
- Apply to: text inputs, textareas, selects, searchable-selects

**Scope**: `src/ui/input.tsx`, `src/ui/form-field.tsx`, `src/ui/searchable-select.tsx`
**Risk**: Medium - Layout shift needs careful handling

#### J2 - Enhanced Validation Feedback
Keep current input layout but improve error/success communication:

- **Shake animation** on validation failure (currently defined but not consistently used)
- **Inline error messages** slide in from below (not just appear)
- **Character count** with color gradient (green → yellow → red as limit approaches)
- **Field-level progress** for multi-step forms (checkmark appears as each field validates)
- **Undo support** for cleared fields (small "restore" link)

**Scope**: `src/ui/form-field.tsx`, `src/ui/input.tsx`
**Risk**: Low - Additive changes

#### J3 - Segmented Controls & Toggle Redesign
Replace switches and checkboxes with more expressive controls:

- **Segmented control** for binary choices (replaces switch where options have labels)
- **Chip-select** for multi-select filters (pill buttons that toggle)
- **Slider with value tooltip** that follows the thumb
- **Color picker** for trip/collection theming (small palette of 8 preset colors)
- **Date range picker** with calendar visualization (for trip dates)

**Scope**: New components in `src/ui/`, feature components that use switches
**Risk**: Medium - New components need design/testing

---

### K: Card & List Item Interactions

**Current state**: Cards use `CardStyles.ts` constants but many bypass them. Hover is `hover:scale-105` on some cards, nothing on others. No swipe actions on list items. Save/favorite is an overlay button on some cards, missing on others. Image aspect ratios are mixed (`aspect-square` vs `aspect-video`).

**Redesign options**:

#### K1 - Gesture-Rich Cards
Add touch interactions to destination cards:

- **Long-press** to preview (shows enlarged card with more detail, like iOS peek)
- **Swipe right** to save/bookmark
- **Swipe left** to add to current trip
- **Double-tap** to open detail view
- **Haptic feedback** on each gesture trigger
- **Undo toast** after swipe actions

**Scope**: `components/CardStyles.ts`, card components, `src/ui/undo-toast.tsx`
**Risk**: Medium - Gesture detection needs tuning for scroll vs swipe

#### K2 - Rich Hover States (Desktop)
Enhance desktop hover interactions on cards:

- **Image zoom** (scale 1.05) with overflow hidden
- **Info overlay** slides up from bottom: category, rating, price level
- **Save button** fades in at top-right corner
- **Quick-add-to-trip** button fades in at top-left
- **Cursor changes** to indicate interactivity
- **Neighboring cards dim** slightly to focus attention

**Scope**: `components/CardStyles.ts`, `app/page.tsx` grid
**Risk**: Low - CSS-only changes for most interactions

#### K3 - List View Mode
Add an alternative list layout alongside the grid:

- **Toggle** between grid and list view (icon in toolbar)
- **List items** show: image thumbnail (64px), name, city, category, rating, save button
- **Swipe actions** on mobile list items (save, add to trip)
- **Compact mode** for power users (even smaller rows, more visible at once)
- **Persist preference** in localStorage

**Scope**: `app/page.tsx`, new `DestinationListItem.tsx` component
**Risk**: Medium - New layout mode for homepage

---

### L: Loading & Transition States

**Current state**: Skeleton loaders (`animate-pulse`) for cards and lists. `LoadingSpinner` for inline loading. `ContentState` component handles loading/error/empty. Page transitions use `slideUpFade` (300ms). Pull-to-refresh exists on mobile. No shared element transitions between views.

**Redesign options**:

#### L1 - Shared Element Transitions
Animate elements that persist across view changes:

- **Card → Detail**: Card image expands to detail page hero (View Transitions API)
- **List item → Drawer**: Thumbnail morphs into drawer header image
- **Tab → Tab**: Content cross-fades instead of instant swap
- **Filter apply**: Cards that match stay, non-matches fade/shrink out
- Uses native View Transitions API (already detected in `NativeExperienceProvider`)

**Scope**: `components/PageTransition.tsx`, `components/NativeExperienceProvider.tsx`, detail pages
**Risk**: Medium - View Transitions API support varies, needs fallbacks

#### L2 - Skeleton Improvements
Refine loading placeholders:

- **Gradient shimmer** instead of pulse (already defined but inconsistently used)
- **Content-aware skeletons** that match actual content shape (e.g., card skeleton shows image + 2 text lines, not generic rectangles)
- **Progressive reveal**: Skeleton → blurred image → sharp image (3-stage)
- **Staggered appearance**: Cards skeleton in grid animates in wave pattern (50ms delay per card)
- **Skeleton-to-content** morph animation (skeleton smoothly transforms into real content)

**Scope**: `src/ui/loading-states.tsx`, `src/ui/skeleton.tsx`, `src/ui/lazy-image.tsx`
**Risk**: Low - Visual refinement only

#### L3 - Optimistic UI & Micro-Feedback
Add immediate visual feedback for user actions:

- **Save button**: Heart fills instantly, revert on API failure
- **Add to trip**: Card briefly highlights green, item appears in trip bar immediately
- **Form submit**: Button text changes to "Saving..." → checkmark icon → original text
- **Delete**: Item fades out immediately, undo toast appears
- **Follow**: Count increments instantly, button state flips immediately
- **Rating**: Stars fill with spring animation as user taps

**Scope**: Action hooks (`useFollow`, `useSave`, trip hooks), button/icon components
**Risk**: Low-Medium - Pattern is additive, needs error rollback logic

---

### M: Toast & Notification Redesign

**Current state**: Sonner v2 for toasts with success/error/info variants. `DismissibleAlert` for persistent alerts. `UndoToast` for reversible actions. Toast styling uses dark mode but doesn't match the editorial palette.

**Redesign options**:

#### M1 - Contextual Toast Positioning
- **Desktop**: Toast appears near the action that triggered it (not always top-right)
- **Mobile**: Bottom-center toast, above the floating trip bar
- **Drawer context**: Toast appears inside the drawer, not overlaying it
- **Success actions**: Brief inline confirmation replaces toast (e.g., "Saved" text next to button)
- **Errors only**: Full toast treatment reserved for errors/warnings; success uses subtle inline feedback

**Scope**: `src/ui/sonner.tsx`, action components
**Risk**: Low - Configuration change

#### M2 - Rich Notification Center
Add a notification panel for persistent messages:

- **Bell icon** in header with unread count badge
- **Notification drawer** with grouped items (trip updates, new destinations, system)
- **Action buttons** inline (accept trip invite, view new destination)
- **Mark as read** swipe gesture on mobile
- **Auto-dismiss** after action is taken

**Scope**: New `components/NotificationCenter.tsx`, header integration
**Risk**: Medium - New feature, needs backend support

---

### N: Scroll & Viewport Interactions

**Current state**: Pull-to-refresh on mobile. `ScrollArea` with custom scrollbar. `content-visibility: auto` not widely used. No scroll-linked animations. No parallax effects. `scrollbar-hide` used on horizontal scroll containers.

**Redesign options**:

#### N1 - Scroll-Linked Animations
- **Header parallax**: Hero image on destination pages scrolls at 0.5x speed
- **Card reveal**: Cards fade in as they enter viewport (IntersectionObserver)
- **Progress indicator**: Thin bar at top showing scroll progress on long pages
- **Section headers**: Sticky section titles that swap as you scroll through categories
- **Back-to-top**: Floating button appears after scrolling 2 screens down

**Scope**: New `hooks/useScrollAnimation.ts`, page components
**Risk**: Low-Medium - Performance-sensitive, needs `will-change` optimization

#### N2 - Infinite Scroll Improvements
- **Virtual scrolling** for the homepage grid (900+ items)
- **Smooth pagination**: Next batch loads before user reaches bottom (preload at 80%)
- **Scroll position restoration** on back navigation
- **"New since last visit"** indicator between old and new content
- **Pull-to-refresh** visual polish: custom spinner matching brand

**Scope**: `app/page.tsx`, `src/ui/pull-to-refresh.tsx`
**Risk**: Medium - Virtualization affects layout and scroll position

---

## Updated Sequencing (All Tracks)

| Phase | Tracks | Nature |
|-------|--------|--------|
| **Phase 1** | B (Typography), D (Spacing) | Foundation - mechanical cleanup |
| **Phase 2** | G1 (Button consolidation), J2 (Validation feedback) | Component standardization |
| **Phase 3** | A (Color), H3 (Drawer visual refresh) | Visual identity |
| **Phase 4** | K2 (Card hover), L2 (Skeleton improvements) | Interaction polish |
| **Phase 5** | E (Animations), L3 (Optimistic UI) | Motion & feedback |
| **Phase 6** | I1 or I2 (Navigation), M1 (Toasts) | Navigation & notifications |
| **Phase 7** | F (Homepage cards), N1 (Scroll animations) | Page-level redesign |
| **Phase 8** | C (Component patterns), H1 (Unified overlays) | Architecture cleanup |

---

## Additional Decision Points

5. **Button migration strategy**: Big-bang (migrate all 1,089 inline buttons at once) or incremental (file-by-file)?
6. **Drawer architecture**: Unified overlay (H1) or keep separate components with visual alignment (H3)?
7. **Mobile navigation**: Bottom tab bar (I2) or sticky header only (I1)?
8. **Card interactions**: Gesture-rich (K1) or hover-focused (K2) or both?
9. **Loading philosophy**: Skeleton-heavy (L2) or optimistic-UI-heavy (L3)?
10. **Toast scope**: Contextual positioning (M1) or full notification center (M2)?

---

## Updated Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Design token usage in components | 5/10 | 8/10 |
| Implementation consistency | 4/10 | 8/10 |
| Hardcoded font sizes | 823+ | < 20 |
| Font families loaded | 4 | 2 |
| Custom animations | 30+ | 10 |
| Accessibility compliance | 6/10 | 8/10 |
| Button component adoption | 10% | 90% |
| Overlay animation consistency | 3 different systems | 1 unified system |
| Hover state patterns | 10+ variants | 3 standardized |
| Transition duration variants | 5+ (150-300ms) | 2 (200ms, 400ms) |

---

*This plan provides options - not all tracks need to be pursued. Pick the tracks that align with current priorities.*
