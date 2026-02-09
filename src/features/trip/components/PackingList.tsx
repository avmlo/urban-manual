'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Check,
  Plus,
  Trash2,
  ChevronDown,
  Shirt,
  Droplets,
  Smartphone,
  FileText,
  Package,
} from 'lucide-react';
import {
  parsePackingList,
  stringifyPackingList,
  type PackingItem,
  type PackingCategory,
  type PackingList as PackingListType,
} from '@/types/trip';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PackingListProps {
  packingList: string | null;
  onSave: (json: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: PackingCategory[] = [
  'clothes',
  'toiletries',
  'tech',
  'documents',
  'other',
];

const CATEGORY_META: Record<
  PackingCategory,
  { label: string; icon: typeof Shirt }
> = {
  clothes: { label: 'Clothes', icon: Shirt },
  toiletries: { label: 'Toiletries', icon: Droplets },
  tech: { label: 'Tech', icon: Smartphone },
  documents: { label: 'Documents', icon: FileText },
  other: { label: 'Other', icon: Package },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PackingList({
  packingList,
  onSave,
  className = '',
}: PackingListProps) {
  const [list, setList] = useState<PackingListType>(() =>
    parsePackingList(packingList)
  );
  const [expandedCategories, setExpandedCategories] = useState<
    Set<PackingCategory>
  >(() => {
    // Start with categories that have items already expanded
    const initial = new Set<PackingCategory>();
    const parsed = parsePackingList(packingList);
    for (const item of parsed.items) {
      initial.add(item.category);
    }
    // If nothing yet, expand "clothes" by default
    if (initial.size === 0) initial.add('clothes');
    return initial;
  });
  const [addInputs, setAddInputs] = useState<Record<string, string>>({});
  const addInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync from prop when it changes externally
  useEffect(() => {
    setList(parsePackingList(packingList));
  }, [packingList]);

  // ------- helpers -------

  const persist = useCallback(
    (next: PackingListType) => {
      setList(next);
      onSave(stringifyPackingList(next));
    },
    [onSave]
  );

  const itemsByCategory = useCallback(
    (category: PackingCategory) =>
      list.items.filter((i) => i.category === category),
    [list.items]
  );

  // ------- actions -------

  const toggleCategory = (cat: PackingCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
        // Auto-focus the add input after expansion (via effect)
        requestAnimationFrame(() => {
          addInputRefs.current[cat]?.focus();
        });
      }
      return next;
    });
  };

  const toggleItem = useCallback(
    (id: string) => {
      const next: PackingListType = {
        items: list.items.map((item) =>
          item.id === id ? { ...item, checked: !item.checked } : item
        ),
      };
      persist(next);
    },
    [list.items, persist]
  );

  const deleteItem = useCallback(
    (id: string) => {
      const next: PackingListType = {
        items: list.items.filter((item) => item.id !== id),
      };
      persist(next);
    },
    [list.items, persist]
  );

  const addItem = useCallback(
    (category: PackingCategory) => {
      const label = (addInputs[category] ?? '').trim();
      if (!label) return;

      const newItem: PackingItem = {
        id: crypto.randomUUID(),
        label,
        category,
        checked: false,
      };

      const next: PackingListType = {
        items: [...list.items, newItem],
      };

      persist(next);
      setAddInputs((prev) => ({ ...prev, [category]: '' }));
      addInputRefs.current[category]?.focus();
    },
    [addInputs, list.items, persist]
  );

  const handleAddKeyDown = (
    e: React.KeyboardEvent,
    category: PackingCategory
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(category);
    }
  };

  // ------- empty state -------

  if (list.items.length === 0 && !CATEGORIES.some((c) => expandedCategories.has(c))) {
    return (
      <div className={className}>
        <p className="text-xs italic text-[var(--editorial-text-tertiary)] mb-3">
          Add items to your packing list
        </p>
        <button
          onClick={() => {
            setExpandedCategories(new Set(['clothes']));
            requestAnimationFrame(() => {
              addInputRefs.current['clothes']?.focus();
            });
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--editorial-accent)] hover:opacity-80 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Start packing list
        </button>
      </div>
    );
  }

  // ------- render -------

  return (
    <div className={`space-y-1 ${className}`}>
      {CATEGORIES.map((category) => {
        const items = itemsByCategory(category);
        const checkedCount = items.filter((i) => i.checked).length;
        const isExpanded = expandedCategories.has(category);
        const meta = CATEGORY_META[category];
        const Icon = meta.icon;

        // Hide empty categories that aren't expanded
        if (items.length === 0 && !isExpanded) return null;

        return (
          <div key={category}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 py-1.5 px-1 group"
            >
              <Icon className="w-3.5 h-3.5 text-[var(--editorial-text-tertiary)] flex-shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--editorial-text-secondary)] flex-shrink-0">
                {meta.label}
              </span>
              {items.length > 0 && (
                <span className="text-[10px] tabular-nums text-[var(--editorial-text-tertiary)] flex-shrink-0">
                  {checkedCount}/{items.length}
                </span>
              )}
              <span className="flex-1" />
              <ChevronDown
                className={`w-3.5 h-3.5 text-[var(--editorial-text-tertiary)] transition-transform duration-200 ${
                  isExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="pl-1 pb-2">
                {/* Item rows */}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center gap-2 py-1 px-1 rounded-md hover:bg-[var(--editorial-bg-elevated)] transition-colors"
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        item.checked
                          ? 'bg-[var(--editorial-accent)] border-[var(--editorial-accent)]'
                          : 'border-[var(--editorial-border)] hover:border-[var(--editorial-text-tertiary)]'
                      }`}
                    >
                      {item.checked && (
                        <Check className="w-2.5 h-2.5 text-white" />
                      )}
                    </button>

                    {/* Label */}
                    <span
                      className={`flex-1 text-sm transition-colors ${
                        item.checked
                          ? 'line-through text-[var(--editorial-text-tertiary)]'
                          : 'text-[var(--editorial-text-primary)]'
                      }`}
                    >
                      {item.label}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="flex-shrink-0 p-0.5 opacity-0 group-hover:opacity-100 text-[var(--editorial-text-tertiary)] hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add input */}
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <input
                    ref={(el) => {
                      addInputRefs.current[category] = el;
                    }}
                    type="text"
                    value={addInputs[category] ?? ''}
                    onChange={(e) =>
                      setAddInputs((prev) => ({
                        ...prev,
                        [category]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => handleAddKeyDown(e, category)}
                    placeholder={`Add ${meta.label.toLowerCase()} item...`}
                    className="flex-1 text-sm px-2 py-1 rounded-md border border-[var(--editorial-border)] bg-transparent text-[var(--editorial-text-primary)] placeholder:text-[var(--editorial-text-tertiary)] outline-none focus:border-[var(--editorial-accent)] transition-colors"
                  />
                  <button
                    onClick={() => addItem(category)}
                    disabled={!(addInputs[category] ?? '').trim()}
                    className="flex-shrink-0 p-1 rounded-md text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add category shortcut row - show collapsed categories that have no items */}
      {(() => {
        const hiddenEmpty = CATEGORIES.filter(
          (c) => itemsByCategory(c).length === 0 && !expandedCategories.has(c)
        );
        if (hiddenEmpty.length === 0) return null;

        return (
          <div className="flex items-center gap-1 pt-1 flex-wrap">
            {hiddenEmpty.map((cat) => {
              const meta = CATEGORY_META[cat];
              const CatIcon = meta.icon;
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)] px-2 py-1 rounded-md border border-dashed border-[var(--editorial-border)] hover:border-[var(--editorial-text-tertiary)] transition-colors"
                >
                  <CatIcon className="w-3 h-3" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
