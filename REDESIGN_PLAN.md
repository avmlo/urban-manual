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

*This plan provides options - not all tracks need to be pursued. Pick the tracks that align with current priorities.*
