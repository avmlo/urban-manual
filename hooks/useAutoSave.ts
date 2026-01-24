import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number; // Auto-save interval in milliseconds (default: 30000 = 30s)
  localStorageKey?: string; // Key for localStorage backup
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  saveNow: () => Promise<void>;
  hasUnsavedChanges: boolean;
}

/**
 * Hook that provides auto-save functionality with localStorage backup
 */
export function useAutoSave<T>({
  data,
  onSave,
  interval = 30000,
  localStorageKey,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastDataRef = useRef<string>(JSON.stringify(data));
  const initialDataRef = useRef<string>(JSON.stringify(data));

  // Save to localStorage as backup
  useEffect(() => {
    if (localStorageKey && enabled) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }, [data, localStorageKey, enabled]);

  // Track unsaved changes
  useEffect(() => {
    const currentData = JSON.stringify(data);
    const hasChanges = currentData !== initialDataRef.current;
    setHasUnsavedChanges(hasChanges);
  }, [data]);

  // Save function
  const saveNow = useCallback(async () => {
    const currentData = JSON.stringify(data);

    // Don't save if no changes
    if (currentData === lastDataRef.current) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave(data);
      lastDataRef.current = currentData;
      initialDataRef.current = currentData;
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Clear localStorage backup after successful save
      if (localStorageKey) {
        try {
          localStorage.removeItem(localStorageKey);
        } catch (error) {
          console.error('Failed to clear localStorage:', error);
        }
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Failed to auto-save changes');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, localStorageKey]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (hasUnsavedChanges && !isSaving) {
        saveNow().catch(console.error);
      }
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, interval, hasUnsavedChanges, isSaving, saveNow]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return {
    isSaving,
    lastSaved,
    saveNow,
    hasUnsavedChanges,
  };
}

/**
 * Hook to recover data from localStorage
 */
export function useRecoverAutoSave<T>(
  localStorageKey: string,
  defaultData: T
): {
  recoveredData: T | null;
  clearRecovery: () => void;
} {
  const [recoveredData, setRecoveredData] = useState<T | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecoveredData(parsed);
      }
    } catch (error) {
      console.error('Failed to recover from localStorage:', error);
    }
  }, [localStorageKey]);

  const clearRecovery = useCallback(() => {
    try {
      localStorage.removeItem(localStorageKey);
      setRecoveredData(null);
    } catch (error) {
      console.error('Failed to clear recovery data:', error);
    }
  }, [localStorageKey]);

  return { recoveredData, clearRecovery };
}
