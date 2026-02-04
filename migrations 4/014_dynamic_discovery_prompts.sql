-- Dynamic Discovery Prompts System
-- Powers time-sensitive travel recommendations (e.g., "Cherry blossom season peaks March 22–April 5")

-- Create discovery_prompts table
CREATE TABLE IF NOT EXISTS discovery_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_slug TEXT REFERENCES destinations(slug) ON DELETE CASCADE,
  city TEXT NOT NULL, -- For city-wide prompts
  country TEXT,
  
  -- Prompt content
  title TEXT NOT NULL, -- e.g., "Cherry Blossom Season"
  prompt_text TEXT NOT NULL, -- e.g., "Cherry blossom season peaks March 22–April 5 — book early for best availability."
  short_prompt TEXT, -- Shorter version for UI
  
  -- Time sensitivity
  prompt_type TEXT NOT NULL DEFAULT 'seasonal', -- 'seasonal', 'event', 'optimal_dates', 'weather', 'custom'
  start_date DATE NOT NULL, -- When prompt becomes active
  end_date DATE NOT NULL, -- When prompt expires
  priority INTEGER DEFAULT 5, -- 1-10, higher = more important
  
  -- Seasonal/Recurring support
  is_recurring BOOLEAN DEFAULT false, -- e.g., cherry blossoms happen every year
  recurrence_pattern TEXT, -- 'yearly', 'monthly', 'weekly'
  recurrence_start_month INTEGER, -- 1-12
  recurrence_start_day INTEGER, -- 1-31
  recurrence_end_month INTEGER, -- 1-12
  recurrence_end_day INTEGER, -- 1-31
  
  -- Actionable data
  action_text TEXT, -- e.g., "book early", "reserve now", "plan ahead"
  booking_url TEXT, -- Optional direct booking link
  related_links JSONB, -- Array of related links
  
  -- Metadata
  created_by TEXT, -- Admin email who created this
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovery_prompts_city ON discovery_prompts(city);
CREATE INDEX IF NOT EXISTS idx_discovery_prompts_destination_slug ON discovery_prompts(destination_slug);
CREATE INDEX IF NOT EXISTS idx_discovery_prompts_dates ON discovery_prompts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_discovery_prompts_active ON discovery_prompts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_discovery_prompts_recurring ON discovery_prompts(is_recurring, recurrence_start_month, recurrence_end_month);

-- Create function to get active prompts for a city (handles recurring)
CREATE OR REPLACE FUNCTION get_active_prompts_for_city(
  p_city TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  destination_slug TEXT,
  city TEXT,
  title TEXT,
  prompt_text TEXT,
  short_prompt TEXT,
  prompt_type TEXT,
  priority INTEGER,
  action_text TEXT,
  booking_url TEXT,
  related_links JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.destination_slug,
    dp.city,
    dp.title,
    dp.prompt_text,
    dp.short_prompt,
    dp.prompt_type,
    dp.priority,
    dp.action_text,
    dp.booking_url,
    dp.related_links
  FROM discovery_prompts dp
  WHERE 
    dp.is_active = true
    AND dp.city = p_city
    AND (
      -- Exact date match (one-time events)
      (p_date >= dp.start_date AND p_date <= dp.end_date AND dp.is_recurring = false)
      OR
      -- Recurring match (seasonal events)
      (
        dp.is_recurring = true
        AND (
          -- Same year range
          (EXTRACT(MONTH FROM p_date) * 100 + EXTRACT(DAY FROM p_date) >= 
           dp.recurrence_start_month * 100 + dp.recurrence_start_day
           AND EXTRACT(MONTH FROM p_date) * 100 + EXTRACT(DAY FROM p_date) <= 
           dp.recurrence_end_month * 100 + dp.recurrence_end_day)
          OR
          -- Cross-year range (e.g., Dec 15 - Jan 10)
          (
            dp.recurrence_start_month > dp.recurrence_end_month
            AND (
              EXTRACT(MONTH FROM p_date) * 100 + EXTRACT(DAY FROM p_date) >= 
              dp.recurrence_start_month * 100 + dp.recurrence_start_day
              OR
              EXTRACT(MONTH FROM p_date) * 100 + EXTRACT(DAY FROM p_date) <= 
              dp.recurrence_end_month * 100 + dp.recurrence_end_day
            )
          )
        )
      )
    )
  ORDER BY dp.priority DESC, dp.start_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get active prompts for a destination
CREATE OR REPLACE FUNCTION get_active_prompts_for_destination(
  p_destination_slug TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id UUID,
  destination_slug TEXT,
  city TEXT,
  title TEXT,
  prompt_text TEXT,
  short_prompt TEXT,
  prompt_type TEXT,
  priority INTEGER,
  action_text TEXT,
  booking_url TEXT,
  related_links JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.destination_slug,
    dp.city,
    dp.title,
    dp.prompt_text,
    dp.short_prompt,
    dp.prompt_type,
    dp.priority,
    dp.action_text,
    dp.booking_url,
    dp.related_links
  FROM discovery_prompts dp
  WHERE 
    dp.is_active = true
    AND dp.destination_slug = p_destination_slug
    AND (
      -- Exact date match
      (p_date >= dp.start_date AND p_date <= dp.end_date AND dp.is_recurring = false)
      OR
      -- Recurring match
      (
        dp.is_recurring = true
        AND (
          (EXTRACT(MONTH FROM p_date) * 100 + EXTRACT(DAY FROM p_date) >= 
           dp.recurrence_start_month * 100 + dp.recurrence_start_day
           AND EXTRACT(MONTH FROM p_date) * 100 + EXTRACT(DAY FROM p_date) <= 
           dp.recurrence_end_month * 100 + dp.recurrence_end_day)
          OR
          (
            dp.recurrence_start_month > dp.recurrence_end_month
            AND (
              EXTRACT(MONTH FROM p_date) * 100 + EXTRACT(DAY FROM p_date) >= 
              dp.recurrence_start_month * 100 + dp.recurrence_start_day
              OR
              EXTRACT(MONTH FROM p_date) * 100 + EXTRACT(DAY FROM p_date) <= 
              dp.recurrence_end_month * 100 + dp.recurrence_end_day
            )
          )
        )
      )
    )
  ORDER BY dp.priority DESC, dp.start_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE discovery_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read active prompts
CREATE POLICY "Anyone can read active prompts"
  ON discovery_prompts FOR SELECT
  USING (is_active = true);

-- Only admins can write (will be enforced in API layer)
-- For now, allow service role to manage
CREATE POLICY "Service role can manage prompts"
  ON discovery_prompts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_discovery_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_discovery_prompts_updated_at
  BEFORE UPDATE ON discovery_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_discovery_prompts_updated_at();

-- Example data: Tokyo Cherry Blossom (recurring)
INSERT INTO discovery_prompts (
  city,
  country,
  title,
  prompt_text,
  short_prompt,
  prompt_type,
  start_date,
  end_date,
  is_recurring,
  recurrence_pattern,
  recurrence_start_month,
  recurrence_start_day,
  recurrence_end_month,
  recurrence_end_day,
  priority,
  action_text,
  is_active
) VALUES (
  'tokyo',
  'Japan',
  'Cherry Blossom Season',
  'Cherry blossom season peaks March 22–April 5 — book early for best availability.',
  'Cherry blossoms peak March 22–April 5',
  'seasonal',
  '2025-03-22',
  '2025-04-05',
  true,
  'yearly',
  3, -- March
  22,
  4, -- April
  5,
  9,
  'book early for best availability',
  true
) ON CONFLICT DO NOTHING;

