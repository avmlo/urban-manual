'use client';

import { useEffect, useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';

// DestinationDrawer removed - now using IntelligentDrawer from app/layout.tsx
import { SavedPlacesDrawer } from '@/features/lists/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/features/lists/components/VisitedPlacesDrawer';
import AddHotelDrawer from '@/features/trip/components/AddHotelDrawer';
import AddFlightDrawer from '@/features/trip/components/AddFlightDrawer';
import AISuggestionsDrawer from '@/features/trip/components/AISuggestionsDrawer';
import TripListDrawer from '@/features/trip/components/TripListDrawer';
import TripOverviewDrawer from '@/features/trip/components/TripOverviewDrawer';
import TripOverviewQuickDrawer from '@/features/trip/components/TripOverviewQuickDrawer';
import PlaceSelectorDrawer from '@/features/trip/components/PlaceSelectorDrawer';
import TripSettingsDrawer from '@/features/trip/components/TripSettingsDrawer';
import { AccountDrawer as AccountDrawerNew } from '@/features/account/components/AccountDrawer';
import { Drawer } from '@/ui/Drawer';
import { useDrawerStyle } from '@/ui/UseDrawerStyle';

// Types that are handled by inline PanelLayout on desktop
const INLINE_TYPES = ['account-new', 'trip-list', 'trip-settings', 'place-selector', 'trip-add-hotel', 'add-flight', 'trip-ai'];

export default function DrawerMount() {
  const { open, type, props, closeDrawer, displayMode } = useDrawerStore();
  const drawerStyle = useDrawerStyle();

  // Track desktop state for conditional rendering
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Helper to check if we should skip overlay (handled by PanelLayout instead)
  const shouldSkipOverlay = (drawerType: string) => {
    return displayMode === 'inline' && isDesktop && INLINE_TYPES.includes(drawerType);
  };

  return (
    <>
      {/* Legacy drawers that use their own drawer context */}
      <SavedPlacesDrawer />
      <VisitedPlacesDrawer />

      {/* New drawers that use the global drawer store */}
      {/* Only render as overlay if not in inline mode on desktop */}
      {open && type === 'account-new' && !shouldSkipOverlay('account-new') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          desktopWidth="420px"
          style={drawerStyle}
          position="right"
        >
          <AccountDrawerNew />
        </Drawer>
      )}

      {/* DestinationDrawer removed - now using IntelligentDrawer from app/layout.tsx */}

      <TripOverviewDrawer
        isOpen={open && type === 'trip-overview'}
        onClose={closeDrawer}
        trip={props?.trip ?? null}
      />

      {open && type === 'trip-list' && !shouldSkipOverlay('trip-list') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Your Trips"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripListDrawer {...props} />
        </Drawer>
      )}

      <TripOverviewQuickDrawer
        isOpen={open && type === 'trip-overview-quick'}
        onClose={closeDrawer}
        trip={props.trip || null}
      />

      {open && type === 'trip-settings' && props?.trip && !shouldSkipOverlay('trip-settings') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Trip Settings"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripSettingsDrawer
            trip={props.trip}
            onUpdate={props?.onUpdate}
            onDelete={props?.onDelete}
          />
        </Drawer>
      )}

      {open && type === 'place-selector' && !shouldSkipOverlay('place-selector') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Add Place"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <PlaceSelectorDrawer
            tripId={props?.tripId}
            dayNumber={props?.dayNumber}
            city={props?.city}
            category={props?.category}
            onSelect={props?.onSelect}
            day={props?.day}
            trip={props?.trip}
            index={props?.index}
            mealType={props?.mealType}
            replaceIndex={props?.replaceIndex}
          />
        </Drawer>
      )}

      {open && type === 'trip-add-hotel' && !shouldSkipOverlay('trip-add-hotel') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Select Hotel"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddHotelDrawer
            trip={props.trip || null}
            day={props.day || null}
            index={props.index}
          />
        </Drawer>
      )}

      {open && type === 'add-flight' && !shouldSkipOverlay('add-flight') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Add Flight"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddFlightDrawer
            tripId={props?.tripId}
            dayNumber={props?.dayNumber}
            onAdd={props?.onAdd}
          />
        </Drawer>
      )}

      {open && type === 'trip-ai' && !shouldSkipOverlay('trip-ai') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Suggestions"
          fullScreen={true}
          position="right"
          style={drawerStyle}
        >
          <AISuggestionsDrawer
            day={props.day || null}
            trip={props.trip || null}
            index={props.index}
            suggestions={props.suggestions}
            onApply={props.onApply}
          />
        </Drawer>
      )}

      {/* TripModal moved to TripModalMount in layout.tsx for higher z-index */}
    </>
  );
}
