-- Helper function to add itinerary items safely
-- This function helps avoid RLS recursion issues when querying for next order_index

-- Function to get the next order_index for a trip/day
-- Uses SECURITY DEFINER to bypass RLS for the query, but still checks user ownership
CREATE OR REPLACE FUNCTION get_next_itinerary_order(
  p_trip_id uuid,
  p_day integer DEFAULT NULL
)
RETURNS TABLE(
  next_day integer,
  next_order integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_next_day integer;
  v_next_order integer;
  v_max_day integer;
BEGIN
  -- First verify the trip exists and belongs to the current user
  -- This check uses RLS, but since we're in SECURITY DEFINER, we need to check manually
  IF NOT EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = p_trip_id
    AND trips.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Trip not found or access denied';
  END IF;

  -- Get the maximum day if p_day is not provided
  IF p_day IS NULL THEN
    SELECT COALESCE(MAX(day), 0) INTO v_max_day
    FROM itinerary_items
    WHERE trip_id = p_trip_id;
    
    v_next_day := GREATEST(v_max_day, 1);
  ELSE
    v_next_day := p_day;
  END IF;

  -- Get the next order_index for the day
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_next_order
  FROM itinerary_items
  WHERE trip_id = p_trip_id
  AND day = v_next_day;

  -- Ensure order_index is at least 0
  IF v_next_order IS NULL THEN
    v_next_order := 0;
  END IF;

  RETURN QUERY SELECT v_next_day, v_next_order;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_itinerary_order(uuid, integer) TO authenticated;


