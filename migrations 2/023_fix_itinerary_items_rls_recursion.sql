-- Fix infinite recursion in itinerary_items RLS policy
-- The issue: itinerary_items policies check trips table,
-- which may trigger checks on itinerary_collaborators, creating a loop
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking trip ownership

-- Create or replace SECURITY DEFINER function that bypasses RLS to check trip ownership
-- This prevents infinite recursion by not triggering RLS policies on trips
CREATE OR REPLACE FUNCTION check_trip_ownership_bypass_rls_for_items(trip_uuid uuid)
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
GRANT EXECUTE ON FUNCTION check_trip_ownership_bypass_rls_for_items(uuid) TO authenticated;

-- Drop existing itinerary_items policies
DROP POLICY IF EXISTS "Users can view itinerary items for their trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can create itinerary items for their trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can update itinerary items for their trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can delete itinerary items for their trips" ON itinerary_items;

-- Recreate policies using SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view itinerary items for their trips"
  ON itinerary_items FOR SELECT
  USING (
    check_trip_ownership_bypass_rls_for_items(itinerary_items.trip_id)
    OR EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND trips.is_public = TRUE
    )
  );

CREATE POLICY "Users can create itinerary items for their trips"
  ON itinerary_items FOR INSERT
  WITH CHECK (
    check_trip_ownership_bypass_rls_for_items(itinerary_items.trip_id)
  );

CREATE POLICY "Users can update itinerary items for their trips"
  ON itinerary_items FOR UPDATE
  USING (
    check_trip_ownership_bypass_rls_for_items(itinerary_items.trip_id)
  )
  WITH CHECK (
    check_trip_ownership_bypass_rls_for_items(itinerary_items.trip_id)
  );

CREATE POLICY "Users can delete itinerary items for their trips"
  ON itinerary_items FOR DELETE
  USING (
    check_trip_ownership_bypass_rls_for_items(itinerary_items.trip_id)
  );

