'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ArchitectTagInputProps {
  value: string[]; // Array of architect names
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export function ArchitectTagInput({
  value = [],
  onChange,
  placeholder = 'Add architect...',
  className = '',
  label,
}: ArchitectTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allArchitects, setAllArchitects] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch existing architects on mount
  useEffect(() => {
    const fetchArchitects = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        // Get distinct architect values from destinations
        const { data, error } = await supabase
          .from('destinations')
          .select('design_firm')
          .not('design_firm', 'is', null)
          .not('design_firm', 'eq', '');

        if (error) throw error;

        // Extract unique architects, handling comma-separated values
        const architectSet = new Set<string>();
        data?.forEach(row => {
          if (row.design_firm) {
            // Split by comma and trim each name
            row.design_firm.split(',').forEach((name: string) => {
              const trimmed = name.trim();
              if (trimmed) architectSet.add(trimmed);
            });
          }
        });

        setAllArchitects(Array.from(architectSet).sort());
      } catch (error) {
        console.error('Error fetching architects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArchitects();
  }, []);

  // Filter suggestions based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }

    const input = inputValue.toLowerCase().trim();
    const filtered = allArchitects.filter(
      architect =>
        architect.toLowerCase().includes(input) &&
        !value.includes(architect) // Exclude already selected
    );
    setSuggestions(filtered.slice(0, 8));
  }, [inputValue, allArchitects, value]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addArchitect = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeArchitect = (name: string) => {
    onChange(value.filter(a => a !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addArchitect(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeArchitect(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
          {label}
        </label>
      )}

      {/* Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((architect, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-sm"
          >
            {architect}
            <button
              type="button"
              onClick={() => removeArchitect(architect)}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : 'Add another...'}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-white transition-all"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50"
          >
            {suggestions.map((architect, index) => (
              <button
                key={index}
                type="button"
                onClick={() => addArchitect(architect)}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                {architect}
              </button>
            ))}
          </div>
        )}

        {/* New architect hint */}
        {inputValue.trim() && !suggestions.some(s => s.toLowerCase() === inputValue.toLowerCase().trim()) && (
          <div className="mt-1.5 text-xs text-gray-500">
            Press Enter to add &quot;{inputValue.trim()}&quot; as new architect
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-1 text-xs text-gray-400">Loading architects...</div>
      )}
    </div>
  );
}
