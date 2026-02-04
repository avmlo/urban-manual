-- Fix infinite recursion in RLS policies for itinerary_items
-- The issue occurs when itinerary_collaborators table exists and creates circular policy checks

-- Drop and recreate itinerary_items policies to avoid recursion
-- Use simpler policies that don't create circular dependencies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view itinerary items for their trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can create itinerary items for their trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can update itinerary items for their trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can delete itinerary items for their trips" ON itinerary_items;

-- Recreate policies with simpler checks that avoid recursion
-- These policies check trips directly without going through other tables

CREATE POLICY "Users can view itinerary items for their trips"
  ON itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create itinerary items for their trips"
  ON itinerary_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update itinerary items for their trips"
  ON itinerary_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete itinerary items for their trips"
  ON itinerary_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- If itinerary_collaborators table exists, ensure its policies don't create recursion
-- Check if table exists first
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'itinerary_collaborators') THEN
    -- Drop any policies that might cause recursion
    DROP POLICY IF EXISTS "Users can view collaborators for their trips" ON itinerary_collaborators;
    DROP POLICY IF EXISTS "Users can manage collaborators for their trips" ON itinerary_collaborators;
    
    -- Create simple policies that don't check back to trips in a way that causes recursion
    CREATE POLICY "Users can view collaborators for their trips"
      ON itinerary_collaborators FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_collaborators.trip_id
          AND trips.user_id = auth.uid()
        )
        OR user_id = auth.uid()
      );
  END IF;
END $$;

