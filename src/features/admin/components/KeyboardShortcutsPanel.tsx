'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import { Badge } from '@/ui/badge';
import {
  Keyboard,
  Command,
} from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  {
    keys: ['⌘', 'K'],
    description: 'Open command palette',
    category: 'Navigation',
  },
  {
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    category: 'Navigation',
  },
  {
    keys: ['Esc'],
    description: 'Close dialogs/modals',
    category: 'Navigation',
  },

  // Content Management
  {
    keys: ['N'],
    description: 'New destination (when on destinations page)',
    category: 'Content',
  },
  {
    keys: ['E'],
    description: 'Edit selected destination',
    category: 'Content',
  },
  {
    keys: ['⌘', 'S'],
    description: 'Save current form',
    category: 'Content',
  },
  {
    keys: ['⌘', 'Enter'],
    description: 'Submit form',
    category: 'Content',
  },

  // Table/List Navigation
  {
    keys: ['↑', '↓'],
    description: 'Navigate through items',
    category: 'Lists',
  },
  {
    keys: ['Space'],
    description: 'Toggle selection',
    category: 'Lists',
  },
  {
    keys: ['⌘', 'A'],
    description: 'Select all items',
    category: 'Lists',
  },

  // Search & Filters
  {
    keys: ['/'],
    description: 'Focus search input',
    category: 'Search',
  },
  {
    keys: ['⌘', 'F'],
    description: 'Find in page',
    category: 'Search',
  },
  {
    keys: ['Enter'],
    description: 'Apply filters',
    category: 'Search',
  },
];

export function KeyboardShortcutsPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Open with "?" key (Shift + /)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Group shortcuts by category
  const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Press <kbd className="px-2 py-1 bg-muted rounded text-xs">?</kbd> anytime to toggle
            this help panel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{category}</h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 bg-muted border rounded text-xs font-mono min-w-[2rem] text-center">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer with tip */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Command className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              <strong>Tip:</strong> Most shortcuts work across the admin interface. Some are
              context-specific and only work on certain pages.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Small trigger button component to open shortcuts panel
 */
export function KeyboardShortcutsButton() {
  const [, setOpen] = useState(false);

  const handleClick = () => {
    // Trigger the "?" keypress event to open the panel
    const event = new KeyboardEvent('keydown', {
      key: '?',
      code: 'Slash',
      shiftKey: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
    >
      <Keyboard className="w-3 h-3" />
      <span>Shortcuts</span>
      <kbd className="px-1.5 py-0.5 bg-muted border rounded text-[10px] font-mono">?</kbd>
    </button>
  );
}
