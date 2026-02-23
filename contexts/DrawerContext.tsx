'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useRef } from 'react';

/**
 * Drawer types that can be opened
 */
export type DrawerType =
  | 'account'
  | 'login'
  | 'login-modal'
  | 'chat'
  | 'destination'
  | 'trips'
  | 'saved-places'
  | 'visited-places'
  | 'settings'
  | 'poi'
  | 'trip-view'
  | 'map'
  | 'create-trip'
  | null;

/**
 * Drawer animation state for coordinating transitions
 */
export type DrawerAnimationState = 'entering' | 'entered' | 'exiting' | 'exited';

/**
 * Drawer data for passing context between drawers
 */
export type DrawerData = Record<string, unknown>;

interface DrawerContextType {
  /** Active drawer key, or null if no drawer is open */
  activeDrawer: DrawerType;
  /** Parent drawer to return to */
  parentDrawer: DrawerType;
  /** Open a specific drawer (automatically closes any other open drawer) */
  openDrawer: (type: DrawerType, parent?: DrawerType, data?: DrawerData) => void;
  /** Toggle a specific drawer (opens it or closes if already active) */
  toggleDrawer: (type: DrawerType) => void;
  /** Close the currently open drawer */
  closeDrawer: () => void;
  /** Go back to parent drawer */
  goBack: () => void;
  /** Check if a specific drawer is open */
  isDrawerOpen: (type: DrawerType) => boolean;
  /** Check if there's a parent drawer to go back to */
  canGoBack: boolean;
  /** Get drawer data */
  getDrawerData: <T = unknown>(key: string) => T | undefined;
  /** Set drawer data */
  setDrawerData: (key: string, value: unknown) => void;
  /** Clear all drawer data */
  clearDrawerData: () => void;
  /** History stack for drawer navigation */
  historyStack: DrawerType[];
  /** Animation state for the current drawer */
  animationState: DrawerAnimationState;
  /** Set animation state (for drawer components) */
  setAnimationState: (state: DrawerAnimationState) => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

/**
 * DrawerProvider manages global drawer state
 * Ensures only one drawer can be open at a time
 * Supports parent drawer for back navigation
 * Includes history stack for complex navigation flows
 */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [parentDrawer, setParentDrawer] = useState<DrawerType>(null);
  const [historyStack, setHistoryStack] = useState<DrawerType[]>([]);
  const [animationState, setAnimationState] = useState<DrawerAnimationState>('exited');
  const drawerDataRef = useRef<DrawerData>({});

  const openDrawer = useCallback(
    (type: DrawerType, parent?: DrawerType, data?: DrawerData) => {
      // Add current drawer to history if one is open
      if (activeDrawer) {
        setHistoryStack((prev) => [...prev, activeDrawer]);
      }

      // Merge any provided data
      if (data) {
        drawerDataRef.current = { ...drawerDataRef.current, ...data };
      }

      setParentDrawer(parent || null);
      setActiveDrawer(type);
      setAnimationState('entering');
    },
    [activeDrawer]
  );

  const toggleDrawer = useCallback(
    (type: DrawerType) => {
      setActiveDrawer((current) => {
        if (current === type) {
          setParentDrawer(null);
          setHistoryStack([]);
          setAnimationState('exiting');
          return null;
        }
        setAnimationState('entering');
        return type;
      });
    },
    []
  );

  const closeDrawer = useCallback(() => {
    setAnimationState('exiting');
    // Delay actual close to allow animation
    setTimeout(() => {
      setActiveDrawer(null);
      setParentDrawer(null);
      setHistoryStack([]);
      setAnimationState('exited');
    }, 200);
  }, []);

  const goBack = useCallback(() => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack((h) => h.slice(0, -1));
      setActiveDrawer(prev);
    } else if (parentDrawer) {
      setActiveDrawer(parentDrawer);
      setParentDrawer(null);
    } else {
      closeDrawer();
    }
  }, [historyStack, parentDrawer, closeDrawer]);

  const isDrawerOpen = useCallback(
    (type: DrawerType) => {
      return activeDrawer === type;
    },
    [activeDrawer]
  );

  const getDrawerData = useCallback(<T = unknown>(key: string): T | undefined => {
    return drawerDataRef.current[key] as T | undefined;
  }, []);

  const setDrawerData = useCallback((key: string, value: unknown) => {
    drawerDataRef.current[key] = value;
  }, []);

  const clearDrawerData = useCallback(() => {
    drawerDataRef.current = {};
  }, []);

  const canGoBack = parentDrawer !== null || historyStack.length > 0;

  const value = useMemo(
    () => ({
      activeDrawer,
      parentDrawer,
      openDrawer,
      toggleDrawer,
      closeDrawer,
      goBack,
      isDrawerOpen,
      canGoBack,
      getDrawerData,
      setDrawerData,
      clearDrawerData,
      historyStack,
      animationState,
      setAnimationState,
    }),
    [
      activeDrawer,
      parentDrawer,
      openDrawer,
      toggleDrawer,
      closeDrawer,
      goBack,
      isDrawerOpen,
      canGoBack,
      getDrawerData,
      setDrawerData,
      clearDrawerData,
      historyStack,
      animationState,
      setAnimationState,
    ]
  );

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}

/**
 * Hook to access drawer context
 * @throws Error if used outside DrawerProvider
 */
export function useDrawer() {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}


