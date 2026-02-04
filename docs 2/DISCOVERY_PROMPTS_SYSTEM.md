# Dynamic Discovery Prompt System

A backend microservice that powers time-sensitive travel recommendations with generative personalization and cross-city correlations.

## Features

### 1. Base Discovery Prompts
Time-sensitive prompts for cities/destinations:
- **Seasonal Events**: Cherry blossoms, autumn leaves, festivals
- **Optimal Dates**: Best times to visit specific locations
- **Event Prompts**: Concerts, exhibitions, special occasions
- **Weather-based**: Best conditions for activities

### 2. Generative Personalization
Uses large language models (Gemini) to compose custom prompts blending factual and emotional data.

**Example**: 
> "Alexander, your saved hotels in Kyoto are near Philosopher's Path — it blooms beautifully this April."

**How it works**:
- Analyzes user's saved destinations in the current city
- Incorporates user preferences and travel history
- Blends with current seasonal/time-sensitive prompts
- Generates conversational, personalized recommendations

### 3. Cross-City Correlation
Suggests parallel experiences across cities based on user's travel history.

**Example**:
> "Loved cherry blossoms in Tokyo? Try jacaranda season in Lisbon this May."

**How it works**:
- Analyzes visited cities and their seasonal experiences
- Finds similar experiences in other cities
- Uses AI to create meaningful connections
- Suggests optimal timing for correlated experiences

## API Endpoints

### GET `/api/discovery-prompts`
Get active prompts for a city/destination.

**Query Parameters**:
- `city` (required): City name
- `destination_slug` (optional): Specific destination
- `date` (optional): Date to check (YYYY-MM-DD), defaults to today

**Response**:
```json
{
  "prompts": [...],
  "city": "tokyo",
  "destination_slug": null,
  "current_date": "2025-03-25"
}
```

### GET `/api/discovery-prompts/personalized`
Get personalized prompts using generative AI.

**Query Parameters**:
- `city` (required): City name
- `user_id` (required): User ID for personalization
- `user_name` (optional): User's display name
- `date` (optional): Date to check

**Response**:
```json
{
  "city": "tokyo",
  "current_date": "2025-03-25",
  "base_prompts": [...],
  "personalized_prompt": "Alexander, your saved hotels in Kyoto are near Philosopher's Path — it blooms beautifully this April."
}
```

### GET `/api/discovery-prompts/cross-city`
Get cross-city correlation suggestions.

**Query Parameters**:
- `city` (required): Current city being browsed
- `user_id` (required): User ID for correlation analysis

**Response**:
```json
{
  "city": "lisbon",
  "correlations": [
    {
      "sourceCity": "tokyo",
      "sourceExperience": "cherry blossoms",
      "targetCity": "lisbon",
      "targetExperience": "jacaranda season",
      "month": 5,
      "correlation_strength": 0.85,
      "prompt": "Loved cherry blossoms in Tokyo? Try jacaranda season in Lisbon this May."
    }
  ],
  "count": 1
}
```

## Database Schema

### `discovery_prompts` Table
- Stores time-sensitive prompts
- Supports recurring events (yearly, monthly, weekly)
- Includes priority, action text, booking URLs
- Linked to cities and/or specific destinations

### Functions
- `get_active_prompts_for_city(city, date)`: Get active prompts for a city
- `get_active_prompts_for_destination(slug, date)`: Get prompts for a destination

## React Component

### `<DiscoveryPrompts />`
Display discovery prompts with personalization and cross-city correlations.

**Props**:
- `city` (required): City to show prompts for
- `destinationSlug` (optional): Specific destination
- `userId` (optional): User ID for personalization
- `userName` (optional): User's display name
- `showPersonalized` (optional): Enable generative personalization
- `showCrossCity` (optional): Enable cross-city correlations
- `className` (optional): Additional CSS classes

**Usage**:
```tsx
<DiscoveryPrompts
  city="tokyo"
  userId={user?.id}
  userName={userName}
  showPersonalized={true}
  showCrossCity={true}
  className="mb-8"
/>
```

## Setup

1. Run the migration:
```bash
psql $DATABASE_URL -f migrations/014_dynamic_discovery_prompts.sql
```

2. Add example data (Tokyo cherry blossoms included in migration)

3. Ensure `GOOGLE_API_KEY` or `GEMINI_API_KEY` is set for generative features

## Example Prompts

### Recurring Seasonal Event
```sql
INSERT INTO discovery_prompts (
  city, title, prompt_text, prompt_type,
  start_date, end_date,
  is_recurring, recurrence_pattern,
  recurrence_start_month, recurrence_start_day,
  recurrence_end_month, recurrence_end_day,
  priority, action_text
) VALUES (
  'tokyo', 'Cherry Blossom Season',
  'Cherry blossom season peaks March 22–April 5 — book early for best availability.',
  'seasonal',
  '2025-03-22', '2025-04-05',
  true, 'yearly',
  3, 22, 4, 5,
  9, 'book early for best availability'
);
```

## Integration

The system integrates with:
- User profiles and preferences
- Saved destinations
- Visit history
- Existing recommendation engine

Prompts automatically appear based on:
- Current date (for seasonal/event prompts)
- User's travel history (for correlations)
- Saved destinations (for personalization)

