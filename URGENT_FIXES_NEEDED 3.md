# Urgent Fixes Needed
## Issues Reported by User - Nov 4, 2025

**Priority:** HIGH - Fix before continuing with account redesign

---

## 🚨 Critical Issues

### 1. Apple Map Not Working ❌
**Problem:** Map shows "Map unavailable" or fails to load

**Root Cause:** MapKit credentials likely not configured
- Requires: `MAPKIT_TEAM_ID`, `MAPKIT_KEY_ID`, `MAPKIT_PRIVATE_KEY`
- These env vars are not in `.env.local.example`

**Fix Required:**
1. Add MapKit env vars to `.env.local.example`:
```bash
# Apple MapKit JS Configuration
MAPKIT_TEAM_ID=your-team-id
MAPKIT_KEY_ID=your-key-id
MAPKIT_PRIVATE_KEY=your-private-key-pem-format
```

2. User needs to:
   - Get MapKit JS credentials from Apple Developer
   - Add to `.env.local`

**Workaround:** Add fallback message if credentials missing

---

### 2. "Open in New Tab" Link Not Working ❌
**Problem:** ExternalLink button in drawer doesn't navigate to destination page

**Location:** `src/features/detail/DestinationDrawer.tsx` (line ~680)

**Current Code:**
```tsx
<button
  onClick={() => {
    onClose();
    router.push(`/destination/${destination.slug}`);
  }}
  className="..."
>
  <ExternalLink className="h-5 w-5" />
</button>
```

**Problem:** `router.push()` navigates in same tab, not new tab

**Fix:** Use a proper `<a>` tag with `target="_blank"`:
```tsx
<a
  href={`/destination/${destination.slug}`}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    e.stopPropagation(); // Don't close drawer on click
  }}
  className="..."
>
  <ExternalLink className="h-5 w-5" />
</a>
```

---

### 3. Pagination Not Centered ❌
**Problem:** Pagination controls not centered on desktop or mobile

**Location:** `app/page.tsx` (line ~904)

**Current Code:**
```tsx
<div className="mt-8 flex items-center justify-center gap-2">
```

**Investigation Needed:**
- Code DOES have `justify-center`
- Might be parent container issue
- Check if pagination is inside a grid that's forcing alignment

**Possible Fix:**
```tsx
<div className="mt-8 flex items-center justify-center gap-2 w-full">
  {/* OR */}
<div className="mt-8 mx-auto flex items-center justify-center gap-2 max-w-fit">
```

---

### 4. Homepage Drawer Needs Redesign 🎨
**Problem:** Homepage uses different drawer than individual place pages

**Files:**
- Homepage uses: `src/features/detail/DestinationDrawer.tsx`
- Place page uses: `components/DestinationDrawer.tsx`

**Issues with Homepage Drawer:**
1. Not updated with mobile UI fixes (touch targets, spacing)
2. Not updated with Next.js Image optimization
3. Different from components/DestinationDrawer.tsx

**Fix Options:**
A. **Unify both drawers** - Use same component everywhere
B. **Update homepage drawer** - Apply same fixes from components/DestinationDrawer.tsx
C. **Redesign homepage drawer** - New design specific for homepage

**Recommendation:** Option A or B (quick fix), then redesign later

---

## 🔧 Fix Priority Order

1. **ExternalLink button** (5 min) - Simple a tag fix
2. **Pagination centering** (10 min) - CSS tweak
3. **Homepage drawer update** (30 min) - Copy fixes from components/
4. **Apple Map docs** (15 min) - Add env var examples and fallback UI

---

## ✅ Already Fixed

- ✅ Apple Map component (retry logic, cleanup, height props)
- ✅ Mobile touch targets in components/DestinationDrawer.tsx
- ✅ Mobile responsive spacing
- ✅ Next.js Image optimization in components/DestinationDrawer.tsx

**BUT:** Homepage uses a DIFFERENT drawer file that doesn't have these fixes!

---

## 📝 Action Plan

### Immediate (Next 1 hour):
1. Fix ExternalLink button in BOTH drawer files
2. Fix pagination centering
3. Update src/features/detail/DestinationDrawer.tsx with all fixes from components/
4. Add MapKit env var docs

### Soon (After immediate fixes):
5. Redesign homepage drawer with better layout
6. Unify drawer components (DRY principle)
7. Add proper error boundaries for MapKit

---

## 🎯 Questions for User

1. **MapKit Credentials:** Do you have Apple MapKit JS credentials set up?
   - If NO: We should add a fallback UI or use a different map provider
   - If YES: Check if env vars are configured correctly

2. **Drawer Unification:** Should homepage and place page use the SAME drawer design?
   - Currently they use different files with different code

3. **Pagination:** Can you send a screenshot showing the alignment issue?
   - It has `justify-center` in code but might be a parent container issue

---

**Status:** Ready to implement fixes
**Estimated Time:** 1-2 hours for all fixes
**Created:** Nov 4, 2025
