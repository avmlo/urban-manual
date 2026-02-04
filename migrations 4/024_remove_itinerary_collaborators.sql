-- Remove itinerary_collaborators table and all its policies
-- This table is not needed and causes infinite recursion in RLS policies
-- We'll drop the table entirely to prevent any RLS recursion issues

-- Drop all policies on itinerary_collaborators first
DO $$
BEGIN
  -- Drop all existing policies
  DROP POLICY IF EXISTS "Users can view collaborators for their trips" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Users can manage collaborators for their trips" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Collaborators can view their own entries" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Trip owners can manage collaborators" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Trip owners can add collaborators" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Users can update collaborators" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Trip owners can remove collaborators" ON itinerary_collaborators;
END $$;

-- Disable RLS on the table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'itinerary_collaborators') THEN
    ALTER TABLE itinerary_collaborators DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop the table entirely (CASCADE will handle any foreign key constraints)
DROP TABLE IF EXISTS itinerary_collaborators CASCADE;

-- Also drop the helper function if it exists (no longer needed)
DROP FUNCTION IF EXISTS check_trip_ownership_bypass_rls(uuid);

