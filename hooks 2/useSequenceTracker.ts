/**
 * Hook to track user actions and build sequences for ML prediction
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMLSequence } from './useMLSequence';

interface Action {
  type: 'view' | 'save' | 'click' | 'search' | 'filter' | 'visit';
  destination_id?: number;
  destination_slug?: string;
  query?: string;
  timestamp: number;
}

const MAX_SEQUENCE_LENGTH = 10;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useSequenceTracker() {
  const [currentSequence, setCurrentSequence] = useState<string[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const lastActionTime = useRef<number>(Date.now());
  const { predictions, predict } = useMLSequence({ enabled: true });

  // Clean up old actions and rebuild sequence
  const updateSequence = useCallback(() => {
    const now = Date.now();
    const recentActions = actions.filter(
      action => now - action.timestamp < SESSION_TIMEOUT
    );

    // Map actions to sequence strings
    const sequence = recentActions
      .slice(-MAX_SEQUENCE_LENGTH)
      .map(action => action.type);

    setCurrentSequence(sequence);

    // Predict next actions if we have a sequence
    if (sequence.length > 0) {
      predict(sequence, 3);
    }
  }, [actions, predict]);

  // Track a new action
  const trackAction = useCallback((action: Omit<Action, 'timestamp'>) => {
    const now = Date.now();
    
    // Check if we need to start a new session
    if (now - lastActionTime.current > SESSION_TIMEOUT) {
      setActions([]);
      setCurrentSequence([]);
    }

    lastActionTime.current = now;

    const newAction: Action = {
      ...action,
      timestamp: now
    };

    setActions(prev => {
      const updated = [...prev, newAction];
      // Keep only recent actions
      return updated.filter(a => now - a.timestamp < SESSION_TIMEOUT);
    });
  }, []);

  // Update sequence when actions change
  useEffect(() => {
    updateSequence();
  }, [updateSequence]);

  // Clear sequence
  const clearSequence = useCallback(() => {
    setActions([]);
    setCurrentSequence([]);
  }, []);

  return {
    currentSequence,
    predictions,
    trackAction,
    clearSequence,
    actions: actions.slice(-MAX_SEQUENCE_LENGTH)
  };
}

