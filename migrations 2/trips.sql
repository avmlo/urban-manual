-- Migration: Create trips and itinerary_items tables for Supabase
-- Run this in your Supabase SQL Editor

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  destination VARCHAR(255),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'planning',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  cover_image VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create itinerary_items table
CREATE TABLE IF NOT EXISTS itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_slug VARCHAR(255),
  day INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  time VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_trip_id ON itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_day ON itinerary_items(day);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_destination_slug ON itinerary_items(destination_slug);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;

-- Trips RLS Policies
CREATE POLICY "Users can view their own trips"
  ON trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public trips"
  ON trips FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can create trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON trips FOR DELETE
  USING (auth.uid() = user_id);

-- Itinerary Items RLS Policies
CREATE POLICY "Users can view itinerary items for their trips"
  ON itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND (trips.user_id = auth.uid() OR trips.is_public = TRUE)
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

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on trips table
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
