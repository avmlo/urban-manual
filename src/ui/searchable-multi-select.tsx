'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toTitleCase } from '@/lib/utils';

export interface SearchableMultiSelectProps {
  /** Current selected values */
  values: string[];
  /** Callback when values change */
  onChange: (values: string[]) => void;
  /** List of options to choose from */
  options: string[];
  /** Placeholder text when no values are selected */
  placeholder?: string;
  /** Whether to allow custom values not in the options list */
  allowCustomValue?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class name for the container */
  className?: string;
  /** Whether the dropdown is loading options */
  isLoading?: boolean;
}

export function SearchableMultiSelect({
  values,
  onChange,
  options,
  placeholder = 'Search or add...',
  allowCustomValue = true,
  disabled = false,
  className,
  isLoading = false,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (value: string) => {
    if (!values.includes(value)) {
      onChange([...values, value]);
    }
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleRemove = (value: string) => {
    onChange(values.filter(v => v !== value));
  };

  const handleCustomValueSubmit = () => {
    if (searchQuery.trim() && allowCustomValue) {
      const normalizedValue = toTitleCase(searchQuery.trim());
      if (!values.includes(normalizedValue)) {
        onChange([...values, normalizedValue]);
      }
      setSearchQuery('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomValueSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Backspace' && !searchQuery && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const filteredOptions = options.filter(
    (option) =>
      !values.includes(option) &&
      (!searchQuery || option.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const searchMatchesExisting = options.some(
    (option) => option.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        onClick={() => { if (!disabled) { setIsOpen(true); } }}
        className={cn(
          'min-h-[42px] w-full px-2 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus-within:ring-2 focus-within:ring-black dark:focus-within:ring-white transition-shadow flex flex-wrap items-center gap-1 cursor-text',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium"
          >
            {value}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(value); }}
                className="hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); if (!isOpen) setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm placeholder:text-gray-400 py-0.5"
        />
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </div>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {searchQuery.trim() && allowCustomValue && !searchMatchesExisting && !values.includes(toTitleCase(searchQuery.trim())) && (
            <button
              type="button"
              onClick={handleCustomValueSubmit}
              className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800"
            >
              Add &ldquo;{toTitleCase(searchQuery.trim())}&rdquo;
            </button>
          )}

          {isLoading ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              Loading...
            </div>
          ) : (
            <>
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {option}
                </button>
              ))}
              {filteredOptions.length === 0 && !searchQuery.trim() && (
                <div className="px-3 py-3 text-center text-xs text-gray-500">
                  {values.length > 0 ? 'All options selected' : 'No options available'}
                </div>
              )}
              {filteredOptions.length === 0 && searchQuery.trim() && !allowCustomValue && (
                <div className="px-3 py-3 text-center text-xs text-gray-500">
                  No matching options
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
