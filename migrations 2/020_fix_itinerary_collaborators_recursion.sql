-- Fix infinite recursion in itinerary_collaborators RLS policy
-- The issue: itinerary_collaborators policy checks trips table,
-- which may have policies that check itinerary_collaborators, creating a loop
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking trip ownership

-- Create a SECURITY DEFINER function that bypasses RLS to check trip ownership
-- This prevents infinite recursion by not triggering RLS policies on trips
-- SECURITY DEFINER functions automatically bypass RLS in PostgreSQL
CREATE OR REPLACE FUNCTION check_trip_ownership_bypass_rls(trip_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Direct query without RLS (SECURITY DEFINER bypasses RLS automatically)
  -- This prevents recursion because it doesn't trigger RLS policies on trips
  RETURN EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = trip_uuid
    AND trips.user_id = auth.uid()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_trip_ownership_bypass_rls(uuid) TO authenticated;

-- Drop all existing policies on itinerary_collaborators
DO $$
BEGIN
  -- Drop all policies on itinerary_collaborators
  DROP POLICY IF EXISTS "Users can view collaborators for their trips" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Users can manage collaborators for their trips" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Collaborators can view their own entries" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Trip owners can manage collaborators" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Trip owners can add collaborators" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Users can update collaborators" ON itinerary_collaborators;
  DROP POLICY IF EXISTS "Trip owners can remove collaborators" ON itinerary_collaborators;
END $$;

-- If table exists, check column name and recreate policies with SECURITY DEFINER function to avoid recursion
DO $$
DECLARE
  trip_col_name TEXT;
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'itinerary_collaborators') THEN
    -- Check what the trip column is actually named
    SELECT column_name INTO trip_col_name
    FROM information_schema.columns
    WHERE table_name = 'itinerary_collaborators'
      AND column_name IN ('trip_id', 'itinerary_id', 'trip_uuid')
    LIMIT 1;
    
    -- If no trip column found, skip policy creation
    IF trip_col_name IS NULL THEN
      RAISE NOTICE 'itinerary_collaborators table exists but no trip column found. Skipping policy creation.';
      RETURN;
    END IF;
    
    -- SELECT policy: users can see collaborators if they are the collaborator OR if they own the trip
    EXECUTE format('CREATE POLICY "Users can view collaborators for their trips"
      ON itinerary_collaborators FOR SELECT
      USING (
        user_id = auth.uid()
        OR check_trip_ownership_bypass_rls(itinerary_collaborators.%I)
      )', trip_col_name);
    
    -- INSERT policy: only trip owners can add collaborators
    -- In WITH CHECK for INSERT, unqualified column names refer to the new row
    EXECUTE format('CREATE POLICY "Trip owners can add collaborators"
      ON itinerary_collaborators FOR INSERT
      WITH CHECK (
        check_trip_ownership_bypass_rls(%I)
      )', trip_col_name);
    
    -- UPDATE policy: trip owners can update, collaborators can update their own status
    -- USING checks existing row, WITH CHECK checks new row values
    -- In WITH CHECK for UPDATE, unqualified column names refer to the new row values
    EXECUTE format('CREATE POLICY "Users can update collaborators"
      ON itinerary_collaborators FOR UPDATE
      USING (
        user_id = auth.uid()
        OR check_trip_ownership_bypass_rls(itinerary_collaborators.%I)
      )
      WITH CHECK (
        user_id = auth.uid()
        OR check_trip_ownership_bypass_rls(%I)
      )', trip_col_name, trip_col_name);
    
    -- DELETE policy: trip owners can remove collaborators
    EXECUTE format('CREATE POLICY "Trip owners can remove collaborators"
      ON itinerary_collaborators FOR DELETE
      USING (
        check_trip_ownership_bypass_rls(itinerary_collaborators.%I)
      )', trip_col_name);
  END IF;
END $$;

