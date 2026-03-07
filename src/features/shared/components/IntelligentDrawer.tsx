'use client';

import { useCallback, memo, useMemo } from 'react';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import DrawerShell from './DrawerShell';
import DestinationContent from './DestinationContent';
import SimilarContent from './SimilarContent';
import WhyThisContent from './WhyThisContent';
import TripContent from './TripContent';
import TripSelectorContent from './TripSelectorContent';
import AddToTripContent from './AddToTripContent';
import AccountContent from './AccountContent';
import AuthContent from './AuthContent';
import ChatContent from './ChatContent';
import { DrawerMode, DrawerContext } from './types';

/**
 * IntelligentDrawer - Universal intelligent drawer
 *
 * A unified drawer system that handles all drawer types:
 * - Destination details with trip integration
 * - Similar places discovery
 * - Why this explanations
 * - Trip planner/editor
 * - Trip selector
 * - Add to trip overlay
 *
 * Features:
 * - Smooth navigation between all modes
 * - History support (back button)
 * - Intelligent context awareness
 * - Full trip builder integration
 * - Smart trip fit analysis
 */
const IntelligentDrawer = memo(function IntelligentDrawer() {
  const { state, close, back, navigate, canGoBack, addToTripQuick, saveScrollPosition, restoreScrollPosition, scrollKey } = useIntelligentDrawer();
  const { activeTrip } = useTripBuilder();
  const { isOpen, mode, context, size } = state;

  // Handle navigation to different modes
  const handleNavigate = useCallback(
    (newMode: DrawerMode, newContext: DrawerContext) => {
      navigate(newMode, newContext);
    },
    [navigate]
  );

  // Handle opening a related destination
  const handleOpenRelated = useCallback(
    (destination: any) => {
      handleNavigate('destination', { destination });
    },
    [handleNavigate]
  );

  // Handle showing similar places
  const handleShowSimilar = useCallback(() => {
    if (context.destination) {
      handleNavigate('similar', { destination: context.destination });
    }
  }, [handleNavigate, context.destination]);

  // Handle showing why this
  const handleShowWhyThis = useCallback(() => {
    if (context.destination) {
      handleNavigate('why-this', {
        destination: context.destination,
        whyThis: context.whyThis,
      });
    }
  }, [handleNavigate, context.destination, context.whyThis]);

  // Handle add to trip
  const handleAddToTrip = useCallback(
    (destination: any, day?: number) => {
      addToTripQuick(destination, day);
    },
    [addToTripQuick]
  );

  // Handle showing add to trip overlay
  const handleShowAddToTrip = useCallback(() => {
    if (context.destination) {
      handleNavigate('add-to-trip', { destination: context.destination });
    }
  }, [handleNavigate, context.destination]);

  // Get title based on mode
  const title = useMemo(() => {
    switch (mode) {
      case 'destination':
        return context.destination?.name || 'Destination';
      case 'similar':
        return 'Similar Places';
      case 'why-this':
        return 'Why This?';
      case 'trip':
        return activeTrip?.title || 'Trip Planner';
      case 'trip-select':
        return 'Your Trips';
      case 'add-to-trip':
        return 'Add to Trip';
      case 'chat':
        return 'Travel Chat';
      case 'account':
        return 'Account';
      case 'auth':
        return 'Sign In';
      case 'settings':
        return 'Settings';
      default:
        return '';
    }
  }, [mode, context.destination, activeTrip]);

  // Get subtitle based on mode
  const subtitle = useMemo(() => {
    switch (mode) {
      case 'destination':
        return context.destination?.city || '';
      case 'similar':
        return context.destination ? `Places like ${context.destination.name}` : '';
      case 'why-this':
        return 'Why This Pick';
      case 'trip':
        return activeTrip?.city || '';
      case 'trip-select':
        return 'Select or create a trip';
      case 'add-to-trip':
        return context.destination?.name || '';
      case 'account':
        return 'Your profile';
      case 'auth':
        return 'Welcome to Urban Manual';
      default:
        return '';
    }
  }, [mode, context.destination, activeTrip]);

  // Render content based on mode
  const renderContent = () => {
    switch (mode) {
      case 'destination':
        if (!context.destination) return null;
        return (
          <DestinationContent
            destination={context.destination}
            related={context.related}
            whyThis={context.whyThis}
            tripContext={
              context.tripFitAnalysis
                ? {
                    day: context.tripFitAnalysis.bestDay,
                    fit: context.tripFitAnalysis.reason,
                  }
                : undefined
            }
            onOpenRelated={handleOpenRelated}
            onShowSimilar={handleShowSimilar}
            onShowWhyThis={handleShowWhyThis}
          />
        );

      case 'similar':
        if (!context.destination) return null;
        return (
          <SimilarContent
            destination={context.destination}
            onSelectDestination={handleOpenRelated}
            onAddToTrip={handleAddToTrip}
          />
        );

      case 'why-this':
        if (!context.destination) return null;
        return (
          <WhyThisContent
            destination={context.destination}
            initialExplanation={context.whyThis}
          />
        );

      case 'trip':
        return <TripContent />;

      case 'trip-select':
        return <TripSelectorContent />;

      case 'add-to-trip':
        return <AddToTripContent />;

      case 'chat':
        return <ChatContent />;

      case 'account':
        return <AccountContent />;

      case 'auth':
        return <AuthContent />;

      case 'settings':
        return (
          <div className="p-5 text-center text-gray-500">
            Settings mode coming soon
          </div>
        );

      default:
        return (
          <div className="p-5 text-center text-gray-500">
            Unknown drawer mode: {mode}
          </div>
        );
    }
  };

  // Determine drawer size based on mode
  const drawerSize = useMemo(() => {
    if (mode === 'trip') return 'large';
    if (mode === 'add-to-trip') return 'small';
    return size;
  }, [mode, size]);

  return (
    <DrawerShell
      isOpen={isOpen}
      size={drawerSize}
      position="right"
      onClose={close}
      onBack={canGoBack ? back : undefined}
      canGoBack={canGoBack}
      title={title}
      subtitle={subtitle}
      scrollKey={scrollKey}
      onSaveScrollPosition={saveScrollPosition}
      restoreScrollPosition={restoreScrollPosition}
    >
      {renderContent()}
    </DrawerShell>
  );
});

export default IntelligentDrawer;
