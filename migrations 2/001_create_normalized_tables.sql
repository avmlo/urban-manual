-- Migration: Create normalized tables for Urban Manual
-- Date: 2025-10-30
-- Purpose: Improve database structure without breaking existing functionality

-- 1. Create cities table
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    instagram_handle TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create list_destinations join table
CREATE TABLE IF NOT EXISTS public.list_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES public.lists(id) ON DELETE CASCADE,
    destination_id INTEGER REFERENCES public.destinations(id) ON DELETE CASCADE,
    note TEXT,
    position INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(list_id, destination_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cities_slug ON public.cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_country ON public.cities(country);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_list_destinations_list_id ON public.list_destinations(list_id);
CREATE INDEX IF NOT EXISTS idx_list_destinations_destination_id ON public.list_destinations(destination_id);

-- Enable Row Level Security
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_destinations ENABLE ROW LEVEL SECURITY;

-- Create policies (allow public read access)
CREATE POLICY "Cities are viewable by everyone" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "List destinations are viewable by everyone" ON public.list_destinations FOR SELECT USING (true);

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- List destinations: Users can manage their own list items
CREATE POLICY "Users can manage own list destinations" ON public.list_destinations 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.lists 
            WHERE lists.id = list_destinations.list_id 
            AND lists.user_id = auth.uid()::text
        )
    );

COMMENT ON TABLE public.cities IS 'Normalized cities table to replace city strings in destinations';
COMMENT ON TABLE public.categories IS 'Normalized categories table to replace category strings in destinations';
COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users';
COMMENT ON TABLE public.list_destinations IS 'Join table for many-to-many relationship between lists and destinations';
