-- =========================================================
-- HELIOS HUB V11 - COMPLETE DATABASE SCHEMA FOR SUPABASE
-- Run this script in your Supabase Dashboard -> SQL Editor
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    username TEXT,
    full_name TEXT NOT NULL,
    email TEXT,
    section TEXT NOT NULL DEFAULT 'Helios',
    circle_of_friends TEXT DEFAULT 'FF',
    avatar_url TEXT,
    avatar_transform JSONB DEFAULT '{"zoom":1, "x":0, "y":0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
CREATE POLICY "Public profiles access" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. REGISTERED USERS DATABASE TABLE
CREATE TABLE IF NOT EXISTS public.registered_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    section TEXT NOT NULL,
    circle_of_friends TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.registered_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public registered_users access" ON public.registered_users;
CREATE POLICY "Public registered_users access" ON public.registered_users FOR ALL USING (true) WITH CHECK (true);

-- 3. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID,
    sender_name TEXT NOT NULL,
    channel_type TEXT NOT NULL,
    channel_target TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public messages access" ON public.messages;
CREATE POLICY "Public messages access" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- ENABLE SUPABASE REALTIME FOR MESSAGES
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 4. OFFICER OF THE DAY (OD) ROSTER TABLE
CREATE TABLE IF NOT EXISTS public.od_roster (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_name TEXT NOT NULL,
    position_order INT DEFAULT 0,
    is_paused BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.od_roster ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public od_roster access" ON public.od_roster;
CREATE POLICY "Public od_roster access" ON public.od_roster FOR ALL USING (true) WITH CHECK (true);

-- 5. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    title TEXT NOT NULL,
    due_date DATE,
    subject_id TEXT,
    library_id TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public tasks access" ON public.tasks;
CREATE POLICY "Public tasks access" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- 6. 365-DAY CALENDAR EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    title TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    subject_id TEXT,
    library_id TEXT,
    reminder_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public calendar_events access" ON public.calendar_events;
CREATE POLICY "Public calendar_events access" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);

-- 7. CLASS PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS public.class_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id TEXT NOT NULL,
    property_key TEXT NOT NULL,
    property_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.class_properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public class_properties access" ON public.class_properties;
CREATE POLICY "Public class_properties access" ON public.class_properties FOR ALL USING (true) WITH CHECK (true);

-- 8. DIGITAL LIBRARY ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.library_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.library_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public library_assets access" ON public.library_assets;
CREATE POLICY "Public library_assets access" ON public.library_assets FOR ALL USING (true) WITH CHECK (true);
