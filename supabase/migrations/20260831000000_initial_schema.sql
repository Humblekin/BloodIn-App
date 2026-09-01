-- Project LifeOrbit — Initial Database Schema & RLS Policies
-- Requires PostgreSQL 16+ and PostGIS extension.

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Enums
CREATE TYPE user_type AS ENUM ('individual', 'organization', 'hospital', 'blood_bank');
CREATE TYPE blood_group AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown');
CREATE TYPE request_status AS ENUM ('active', 'fulfilled', 'cancelled', 'expired');
CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE visibility_level AS ENUM ('public', 'connections', 'private', 'city');

-- 3. Utility Functions
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Tables

-- Profiles Table (Extends Supabase Auth User)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type user_type NOT NULL DEFAULT 'individual',
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  blood_group blood_group,
  
  -- Location data (Stored securely, only exposed via explicit queries)
  location_point GEOGRAPHY(POINT, 4326),
  city_id TEXT,
  region_id TEXT,
  country_id TEXT,
  
  is_verified BOOLEAN DEFAULT false,
  verification_level INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();


-- Privacy Settings Table (1-to-1 with Profile)
CREATE TABLE public.privacy_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Visibility Controls
  blood_group_visibility visibility_level DEFAULT 'connections',
  location_visibility visibility_level DEFAULT 'city',
  messaging_permission visibility_level DEFAULT 'connections',
  
  -- Feature Toggles
  show_in_discovery BOOLEAN DEFAULT true,
  show_in_orbit BOOLEAN DEFAULT true,
  
  -- Notifications
  allow_emergency_notifications BOOLEAN DEFAULT true,
  allow_community_notifications BOOLEAN DEFAULT true,
  allow_campaign_notifications BOOLEAN DEFAULT true,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_privacy_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();


-- Connections Table (Many-to-Many social graph)
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(requester_id, recipient_id)
);

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();


-- Blood Requests Table (Critical alerts)
CREATE TABLE public.blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name TEXT, -- Optional, for hospitals
  blood_group blood_group NOT NULL,
  units_required INTEGER NOT NULL DEFAULT 1,
  urgency_level INTEGER NOT NULL DEFAULT 1, -- 1=Normal, 2=Urgent, 3=Critical
  
  hospital_name TEXT NOT NULL,
  location_point GEOGRAPHY(POINT, 4326) NOT NULL,
  contact_number TEXT,
  additional_notes TEXT,
  
  status request_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_blood_requests_updated_at
  BEFORE UPDATE ON blood_requests
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();


-- 5. Row Level Security (RLS) Configuration

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- 1. Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- 2. Users can read other profiles if they are public OR if they are connected
-- (Note: Exact logic relies on querying privacy_settings, keeping simple here for MVP)
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);


-- Privacy Settings Policies
-- 1. Users can only view and update their own privacy settings
CREATE POLICY "Users can manage own privacy settings" 
ON public.privacy_settings FOR ALL 
USING (auth.uid() = user_id);


-- Connections Policies
-- 1. Users can see connections where they are requester or recipient
CREATE POLICY "Users can view own connections" 
ON public.connections FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- 2. Users can insert a connection if they are the requester
CREATE POLICY "Users can create connection requests" 
ON public.connections FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

-- 3. Users can update a connection if they are the recipient (to accept/reject) 
--    OR the requester (to cancel)
CREATE POLICY "Users can update own connections" 
ON public.connections FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);


-- Blood Requests Policies
-- 1. Anyone authenticated can view active requests
CREATE POLICY "Authenticated users can view requests" 
ON public.blood_requests FOR SELECT 
USING (auth.role() = 'authenticated' AND status = 'active');

-- 2. Users can manage their own requests
CREATE POLICY "Users can manage own requests" 
ON public.blood_requests FOR ALL 
USING (auth.uid() = requester_id);


-- 6. Spatial Indexes
CREATE INDEX idx_profiles_location ON public.profiles USING GIST(location_point);
CREATE INDEX idx_requests_location ON public.blood_requests USING GIST(location_point);

-- 7. Trigger to auto-create Profile and Privacy rows on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'User'));
  
  INSERT INTO public.privacy_settings (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
