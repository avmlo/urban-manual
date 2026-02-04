-- Social Ranking Migration
-- Adds follow_cities feature and save_count to destinations for better ranking

-- 1. Add save_count column to destinations table
ALTER TABLE destinations
ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_destinations_save_count
ON destinations(save_count DESC);

-- 3. Create follow_cities table
CREATE TABLE IF NOT EXISTS follow_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city_slug VARCHAR(255) NOT NULL,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, city_slug)
);

-- 4. Create indexes for follow_cities
CREATE INDEX IF NOT EXISTS idx_follow_cities_user_id
ON follow_cities(user_id);

CREATE INDEX IF NOT EXISTS idx_follow_cities_city_slug
ON follow_cities(city_slug);

-- 5. Enable Row Level Security
ALTER TABLE follow_cities ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for follow_cities
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own followed cities" ON follow_cities;
DROP POLICY IF EXISTS "Users can follow cities" ON follow_cities;
DROP POLICY IF EXISTS "Users can unfollow cities" ON follow_cities;

CREATE POLICY "Users can view their own followed cities"
  ON follow_cities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow cities"
  ON follow_cities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow cities"
  ON follow_cities FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Function to automatically update save_count
CREATE OR REPLACE FUNCTION update_destination_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE destinations
    SET save_count = save_count + 1
    WHERE slug = NEW.destination_slug;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE destinations
    SET save_count = GREATEST(save_count - 1, 0)
    WHERE slug = OLD.destination_slug;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger on saved_places table
DROP TRIGGER IF EXISTS update_save_count_trigger ON saved_places;
CREATE TRIGGER update_save_count_trigger
AFTER INSERT OR DELETE ON saved_places
FOR EACH ROW
EXECUTE FUNCTION update_destination_save_count();

-- 9. Initialize save_count for existing destinations
UPDATE destinations
SET save_count = (
  SELECT COUNT(*)
  FROM saved_places
  WHERE saved_places.destination_slug = destinations.slug
);

-- Success message
SELECT 'Social ranking migration completed! Added follow_cities and save_count features.' as status;
