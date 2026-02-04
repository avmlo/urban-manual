# Mobile-First Claude Code Plan
## $1000 Credits | Nov 4-18 | Mobile UI Priority

**Status:** Ready for coordination with Cursor work
**Last Updated:** Nov 4, 2025

---

## 🤝 Conflict Avoidance Strategy

### What I Need From You:

**Before I start, please tell me:**

1. **What files are you actively editing in Cursor?**
   - Pages you're working on?
   - Components you're modifying?
   - Any specific directories off-limits?

2. **Mobile issues you've noticed:**
   - What looks "sketchy" specifically?
   - Homepage? Drawer? Navigation?
   - Any user complaints?

3. **Coordination preference:**
   - Should I create new mobile-specific components (`components/mobile/`) vs modifying existing?
   - Should I work on separate feature branches?
   - Want real-time coordination or async via git?

---

## 🔒 Proposed File Strategy

### **New Files I'll Create** (Zero Conflicts)
These won't touch your existing work:

```
components/mobile/
├── MobileBottomNav.tsx          (NEW - sticky bottom navigation)
├── MobileDrawer.tsx              (NEW - swipeable full-screen drawer)
├── MobileHeader.tsx              (NEW - optimized header)
├── MobileSearchBar.tsx           (NEW - mobile search)
├── MobileFilters.tsx             (NEW - mobile filter sheet)
├── MobileTouchCard.tsx           (NEW - touch-optimized cards)
├── PullToRefresh.tsx             (NEW - pull-to-refresh)
└── MobileGestureWrapper.tsx      (NEW - swipe gestures)

app/api/mobile/
├── detect/route.ts               (NEW - device detection API)
└── preferences/route.ts          (NEW - mobile preferences)

hooks/
├── useMobileDetect.ts            (NEW - device detection hook)
├── useSwipeGesture.ts            (NEW - swipe gesture hook)
├── usePullToRefresh.ts           (NEW - pull-to-refresh hook)
└── useTouchOptimized.ts          (NEW - touch optimization)

styles/
└── mobile.css                    (NEW - mobile-specific styles)
```

### **Files I Might Modify** (Potential Conflicts - Tell Me If Off-Limits)
```
⚠️ app/layout.tsx                  (Add mobile detection wrapper)
⚠️ app/page.tsx                    (Integrate mobile components)
⚠️ components/Header.tsx           (Add mobile variant toggle)
⚠️ components/DestinationDrawer.tsx (Add mobile mode props)
⚠️ tailwind.config.ts              (Add mobile breakpoints)
⚠️ next.config.ts                  (Add mobile optimizations)
```

### **Files I Won't Touch** (Safe For You)
```
✅ All business logic files
✅ API routes (unless mobile-specific)
✅ Database migrations
✅ Python ML service
✅ Scripts
✅ Types (unless adding mobile types)
```

---

## 📱 Mobile Issues I've Identified

### **Current Mobile Problems:**

1. **Header/Navigation** (`components/Header.tsx`)
   - Dropdown menu not mobile-friendly
   - Small touch targets (32px minimum needed)
   - No bottom navigation for thumb reach
   - Logo + Menu cramped on small screens

2. **Destination Drawer** (`components/DestinationDrawer.tsx`)
   - Not full-screen on mobile
   - No swipe-to-close gesture
   - Small close button
   - Content cuts off on small screens
   - No native share API integration

3. **Homepage Cards** (`app/page.tsx`)
   - Cards might be too small for touch
   - No pull-to-refresh
   - Grid layout cramped on mobile
   - Search bar not optimized for mobile

4. **Search & Filters** (`src/features/search/`)
   - Desktop-focused layout
   - Filters not in mobile sheet/drawer
   - Search autocomplete too wide

5. **General Mobile UX**
   - No mobile-specific loading states
   - No haptic feedback
   - No safe area insets (notch handling)
   - Missing iOS-specific optimizations

---

## 🎯 Mobile-First 2-Week Plan

### **Week 1: Core Mobile UI** ($400-500)

#### **Day 1-2: Mobile Layout Foundation** ($80-120)
- [ ] Create `MobileDetect` hook and context
- [ ] Add mobile breakpoint detection
- [ ] Create mobile-specific layout wrapper
- [ ] Add safe area insets (notch/home indicator)
- [ ] Set up mobile viewport meta tags
- **Files:** NEW hooks, NEW layout wrapper
- **Conflicts:** Minimal (adds wrapper to layout.tsx)

#### **Day 3-4: Mobile Navigation** ($100-150)
- [ ] Create `MobileBottomNav` component
  - Sticky bottom navigation
  - Icons: Home, Search, Saved, Map, Account
  - Active state indicators
  - 56px height (thumb-friendly)
- [ ] Create `MobileHeader` component
  - Minimal top bar
  - Search icon + logo + menu
  - Optimized spacing
- [ ] Add haptic feedback (iOS)
- [ ] Smooth transitions
- **Files:** NEW mobile components
- **Conflicts:** MEDIUM (modifies layout.tsx to conditionally use mobile header)

#### **Day 5-6: Swipeable Drawer** ($120-150)
- [ ] Create `MobileDrawer` component
  - Full-screen on mobile
  - Swipe-down-to-close gesture
  - Pull indicator at top
  - Smooth animations (spring physics)
  - Native share API integration
- [ ] Add gesture detection (swipe threshold)
- [ ] Haptic feedback on swipe
- [ ] Update `DestinationDrawer` to use mobile variant
- **Files:** NEW MobileDrawer.tsx, UPDATE DestinationDrawer.tsx
- **Conflicts:** MEDIUM (modifies DestinationDrawer.tsx)

#### **Day 7: Pull-to-Refresh** ($60-80)
- [ ] Create `PullToRefresh` component
- [ ] Add to homepage, city pages, account page
- [ ] Custom loading animation
- [ ] Haptic feedback on trigger
- **Files:** NEW PullToRefresh.tsx
- **Conflicts:** LOW (wraps page content)

---

### **Week 2: Mobile Optimization & Features** ($400-500)

#### **Day 8-9: Touch-Optimized Cards** ($80-120)
- [ ] Create `MobileTouchCard` component
  - Larger touch targets (44x44px minimum)
  - Improved tap feedback (scale animation)
  - Swipe actions (save, visit, share)
  - Long-press menu
- [ ] Update homepage grid for mobile
  - 1 column on small screens
  - 2 columns on medium screens
  - Better spacing
- **Files:** NEW MobileTouchCard.tsx, UPDATE app/page.tsx
- **Conflicts:** HIGH (modifies homepage cards)

#### **Day 10-11: Mobile Search & Filters** ($100-140)
- [ ] Create `MobileSearchBar` component
  - Full-width input
  - Voice search button
  - Clear button
  - Auto-focus on tap
- [ ] Create `MobileFilters` component
  - Bottom sheet drawer
  - Touch-friendly toggles
  - "Apply" / "Clear" buttons
  - Smooth slide-up animation
- [ ] Integrate with existing search API
- **Files:** NEW mobile search components
- **Conflicts:** MEDIUM (updates SearchFilters integration)

#### **Day 12: Mobile-Specific Features** ($80-100)
- [ ] Add "Open in Maps" button (Apple Maps/Google Maps)
- [ ] Add "Call" button for places with phone numbers
- [ ] Native share sheet integration
- [ ] Add to Home Screen prompt
- [ ] Location permission handling
- **Files:** NEW utility functions, UPDATE drawer
- **Conflicts:** LOW (adds features to existing components)

#### **Day 13: Performance & Polish** ($80-100)
- [ ] Optimize images for mobile (smaller sizes)
- [ ] Reduce mobile bundle size
- [ ] Add mobile-specific loading skeletons
- [ ] Improve mobile animations (60fps)
- [ ] Test on real devices
- **Files:** Config updates, NEW loading states
- **Conflicts:** LOW (mostly config and new files)

#### **Day 14: Testing & Documentation** ($60-80)
- [ ] Mobile browser testing (iOS Safari, Chrome, Firefox)
- [ ] PWA manifest optimization
- [ ] Mobile-specific bug fixes
- [ ] Document mobile components
- [ ] Update mobile guidelines
- **Files:** Tests, docs
- **Conflicts:** ZERO (documentation only)

---

## 🎨 Mobile Design Principles

### Touch Targets
- **Minimum:** 44x44px (iOS guidelines)
- **Preferred:** 48x48px (Material Design)
- **Spacing:** 8px minimum between targets

### Safe Areas
- Handle notch/home indicator
- Bottom nav: +32px padding on iPhone
- Top header: respect status bar

### Gestures
- Swipe-to-close drawers
- Pull-to-refresh lists
- Swipe actions on cards
- Long-press menus

### Performance
- Smooth 60fps animations
- Optimized images (<100KB)
- Lazy load below fold
- Debounce scroll events

---

## 📊 Expected Mobile Improvements

### User Experience
- ✅ **Native-feeling navigation** (bottom nav)
- ✅ **Intuitive gestures** (swipe, pull, long-press)
- ✅ **Larger touch targets** (no more mis-taps)
- ✅ **Full-screen drawers** (more content visible)
- ✅ **Fast interactions** (60fps animations)

### Performance
- ✅ **30% smaller mobile bundle**
- ✅ **2x faster initial load on mobile**
- ✅ **Better mobile PageSpeed score** (90+)
- ✅ **Reduced data usage** (optimized images)

### Features
- ✅ **Pull-to-refresh**
- ✅ **Swipe gestures**
- ✅ **Native share**
- ✅ **Open in Maps**
- ✅ **Call buttons**
- ✅ **Add to Home Screen**

---

## 🚨 Before I Start - Action Items for You

### Please Answer These:

1. **What are you actively working on in Cursor?**
   - [ ] I'm working on: _______________
   - [ ] Files I'm editing: _______________
   - [ ] Features I'm building: _______________

2. **Mobile UI priorities:**
   - [ ] Most important: _______________
   - [ ] Can wait: _______________
   - [ ] Nice to have: _______________

3. **Conflict strategy preference:**
   - [ ] Option A: I create all NEW components, you integrate later
   - [ ] Option B: I modify existing, you merge carefully
   - [ ] Option C: We coordinate file-by-file in real-time
   - [ ] Option D: You finish your work first, then I start

4. **Mobile-specific issues you've seen:**
   - [ ] Issue 1: _______________
   - [ ] Issue 2: _______________
   - [ ] Issue 3: _______________

---

## 🎮 Coordination Workflow

### Recommended Approach:

**Option 1: Parallel Work (Safest)**
1. You tell me which files are off-limits
2. I create NEW mobile components in `components/mobile/`
3. I work on separate feature branch: `claude/mobile-ui-*`
4. You review and integrate when ready
5. Zero merge conflicts

**Option 2: Sequential Work**
1. You finish your current task
2. Push to your branch
3. I pull and start mobile work
4. I push to my branch
5. You merge when ready

**Option 3: Real-time Coordination**
1. You tell me what you're editing RIGHT NOW
2. I work on different files
3. We coordinate via git status
4. Merge frequently

---

## 📝 Daily Status Template

I'll provide daily updates:

```markdown
## Day X Mobile Progress

### Completed Today
- [x] Task 1
- [x] Task 2

### New Files Created
- components/mobile/BottomNav.tsx
- hooks/useMobileDetect.ts

### Files Modified
- app/layout.tsx (added mobile wrapper)

### Credits Used
- Today: $XX
- Total: $XXX / $1000

### Tomorrow's Plan
- [ ] Task 3
- [ ] Task 4

### Blockers
- Need: [your input on X]
```

---

## 🚀 Ready to Start?

**Next Steps:**

1. **You tell me:**
   - What you're working on in Cursor
   - Which files to avoid
   - Mobile priority order

2. **I'll adjust the plan** based on your input

3. **We start with Day 1** (mobile foundation - all NEW files, zero conflicts)

4. **Daily coordination** to avoid stepping on each other's toes

**Let me know:**
- What are you working on in Cursor?
- What mobile issues bother you most?
- Should I start with all-new components or can I modify existing?

---

**Plan Status:** ⏸️ Waiting for coordination input
**Created:** Nov 4, 2025
**Expires:** Nov 18, 2025
**Credits:** $1000 available
