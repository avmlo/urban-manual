# Search Feature Module

## Overview
The search feature module contains all UI components and logic related to search functionality, including the main search interface, filters, and conversational search responses.

## Components

### `CompactResponseSection.tsx`
Conversational response interface for search results. Displays:
- Contextual messages based on search query
- Clickable refinement chips
- Optional follow-up input for conversational search

**Usage:**
```tsx
import { CompactResponseSection } from '@/src/features/search/CompactResponseSection';

<CompactResponseSection
  query={query}
  messages={conversationHistory}
  suggestions={suggestions}
  onChipClick={handleRefinement}
  onFollowUp={handleFollowUp}
/>
```

### `GreetingHero.tsx`
Main search input component with AI-powered suggestions and filters.

**Features:**
- Rotating AI-powered placeholders
- Auto-complete suggestions
- Filter integration
- AI search mode toggle

**Usage:**
```tsx
import GreetingHero from '@/src/features/search/GreetingHero';

<GreetingHero
  searchQuery={query}
  onSearchChange={setQuery}
  onSubmit={handleSearch}
  isAIEnabled={true}
/>
```

### `SearchFilters.tsx`
Advanced search filters component.

**Features:**
- City filter
- Category filter
- Michelin stars filter
- Price range filter
- Rating filter
- Open now filter

**Usage:**
```tsx
import { SearchFiltersComponent } from '@/src/features/search/SearchFilters';

<SearchFiltersComponent
  filters={filters}
  onFiltersChange={setFilters}
  availableCities={cities}
  availableCategories={categories}
/>
```

## Code Splitting

All search components are automatically code-split via Next.js dynamic imports when used in routes. Heavy components like `CompactResponseSection` with follow-up functionality are lazy-loaded.

## Dependencies

- `@/lib/search/generateSearchContext` - Context generation utilities
- `@/lib/search/generateSuggestions` - Suggestion generation utilities
- `@/components/ui/*` - Shared UI components (badge, button, etc.)

## Future Enhancements

- [ ] Voice search integration
- [ ] Visual search (image-based)
- [ ] Advanced filtering with saved filter presets
- [ ] Search history and suggestions based on user behavior
