-- Updated schema for Firebase UID compatibility
-- Changed UUID columns to VARCHAR(128) to support Firebase UIDs

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(128) PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL CHECK (phone_number ~ '^\+261[0-9]{9}$'),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(255),
    firebase_uid VARCHAR(128) UNIQUE,
    preferred_language VARCHAR(2) CHECK (preferred_language IN ('fr', 'mg', 'en')) DEFAULT 'fr',
    is_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) CHECK (role IN ('entrepreneur', 'admin', 'partner')) DEFAULT 'entrepreneur',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(128) REFERENCES users(user_id)
);

-- Table: business_profiles
CREATE TABLE IF NOT EXISTS business_profiles (
    business_id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(128) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name_fr VARCHAR(255) NOT NULL,
    name_mg VARCHAR(255),
    name_en VARCHAR(255),
    description_fr TEXT NOT NULL,
    description_mg TEXT,
    description_en TEXT,
    region VARCHAR(50) NOT NULL CHECK (region IN ('Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Toliara', 'Antsiranana')),
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('agricultural', 'artisan', 'digital_services', 'manufacturing')),
    registration_number VARCHAR(50) UNIQUE,
    export_interests JSONB, -- Stores target countries and products
    contact_phone VARCHAR(15) CHECK (contact_phone ~ '^\+261[0-9]{9}$'),
    contact_email VARCHAR(255),
    website_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(20) CHECK (verification_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    currency VARCHAR(3) DEFAULT 'MGA' CHECK (currency IN ('MGA', 'USD', 'EUR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(128) REFERENCES users(user_id)
);

-- Table: opportunities
CREATE TABLE IF NOT EXISTS opportunities (
    opportunity_id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid(),
    title_fr VARCHAR(255) NOT NULL,
    title_mg VARCHAR(255),
    title_en VARCHAR(255),
    description_fr TEXT NOT NULL,
    description_mg TEXT,
    description_en TEXT,
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN ('agricultural', 'artisan', 'digital_services', 'manufacturing')),
    target_countries JSONB, -- Stores target countries
    industry VARCHAR(100),
    estimated_value NUMERIC(15, 2),
    currency VARCHAR(3) DEFAULT 'MGA' CHECK (currency IN ('MGA', 'USD', 'EUR')),
    expiration_date DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'expired', 'closed')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(128) REFERENCES users(user_id)
);

-- Table: matches
CREATE TABLE IF NOT EXISTS matches (
    match_id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(128) NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
    opportunity_id VARCHAR(128) NOT NULL REFERENCES opportunities(opportunity_id) ON DELETE CASCADE,
    match_score NUMERIC(5, 2) CHECK (match_score BETWEEN 0 AND 100),
    match_reason TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(128) REFERENCES users(user_id),
    UNIQUE (business_id, opportunity_id)
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
    message_id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id VARCHAR(128) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id VARCHAR(128) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    match_id VARCHAR(128) REFERENCES matches(match_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(128) REFERENCES users(user_id)
);

-- Table: success_stories
CREATE TABLE IF NOT EXISTS success_stories (
    story_id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(128) NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
    title_fr VARCHAR(255) NOT NULL,
    title_mg VARCHAR(255),
    title_en VARCHAR(255),
    description_fr TEXT NOT NULL,
    description_mg TEXT,
    description_en TEXT,
    outcome TEXT,
    photos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(128) REFERENCES users(user_id)
);

-- Table: contact_requests
CREATE TABLE IF NOT EXISTS contact_requests (
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id VARCHAR(128) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    recipient_user_id VARCHAR(128) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    target_business_id VARCHAR(128) NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: profile_views
CREATE TABLE IF NOT EXISTS profile_views (
    id VARCHAR(128) PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id VARCHAR(128) NOT NULL REFERENCES business_profiles(business_id) ON DELETE CASCADE,
    viewer_user_id VARCHAR(128) REFERENCES users(user_id) ON DELETE SET NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_region ON business_profiles(region);
CREATE INDEX IF NOT EXISTS idx_business_profiles_business_type ON business_profiles(business_type);
CREATE INDEX IF NOT EXISTS idx_business_profiles_verified ON business_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_business_profiles_verification_status ON business_profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON opportunities(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_business_type ON opportunities(business_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_expiration_date ON opportunities(expiration_date);

CREATE INDEX IF NOT EXISTS idx_matches_business_id ON matches(business_id);
CREATE INDEX IF NOT EXISTS idx_matches_opportunity_id ON matches(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON matches(created_by);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_success_stories_business_id ON success_stories(business_id);
CREATE INDEX IF NOT EXISTS idx_success_stories_created_by ON success_stories(created_by);

CREATE INDEX IF NOT EXISTS idx_contact_requests_sender_user_id ON contact_requests(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_recipient_user_id ON contact_requests(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_requests_target_business_id ON contact_requests(target_business_id);

CREATE INDEX IF NOT EXISTS idx_profile_views_business_id ON profile_views(business_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_user_id ON profile_views(viewer_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON profile_views(viewed_at);

-- Full-text search indexes for multilingual support
CREATE INDEX IF NOT EXISTS idx_business_profiles_search_fr ON business_profiles USING gin(to_tsvector('french', name_fr || ' ' || description_fr));
CREATE INDEX IF NOT EXISTS idx_business_profiles_search_mg ON business_profiles USING gin(to_tsvector('simple', name_mg || ' ' || description_mg));
CREATE INDEX IF NOT EXISTS idx_business_profiles_search_en ON business_profiles USING gin(to_tsvector('english', name_en || ' ' || description_en));

CREATE INDEX IF NOT EXISTS idx_opportunities_search_fr ON opportunities USING gin(to_tsvector('french', title_fr || ' ' || description_fr));
CREATE INDEX IF NOT EXISTS idx_opportunities_search_mg ON opportunities USING gin(to_tsvector('simple', title_mg || ' ' || description_mg));
CREATE INDEX IF NOT EXISTS idx_opportunities_search_en ON opportunities USING gin(to_tsvector('english', title_en || ' ' || description_en));

CREATE INDEX IF NOT EXISTS idx_success_stories_search_fr ON success_stories USING gin(to_tsvector('french', title_fr || ' ' || description_fr));
CREATE INDEX IF NOT EXISTS idx_success_stories_search_mg ON success_stories USING gin(to_tsvector('simple', title_mg || ' ' || description_mg));
CREATE INDEX IF NOT EXISTS idx_success_stories_search_en ON success_stories USING gin(to_tsvector('english', title_en || ' ' || description_en));

-- JSONB indexes for export interests and target countries
CREATE INDEX IF NOT EXISTS idx_business_profiles_export_interests ON business_profiles USING gin(export_interests);
CREATE INDEX IF NOT EXISTS idx_opportunities_target_countries ON opportunities USING gin(target_countries);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER IF NOT EXISTS update_business_profiles_timestamp
    BEFORE UPDATE ON business_profiles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER IF NOT EXISTS update_opportunities_timestamp
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER IF NOT EXISTS update_matches_timestamp
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER IF NOT EXISTS update_messages_timestamp
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER IF NOT EXISTS update_success_stories_timestamp
    BEFORE UPDATE ON success_stories
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER IF NOT EXISTS update_contact_requests_timestamp
    BEFORE UPDATE ON contact_requests
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER IF NOT EXISTS update_profile_views_timestamp
    BEFORE UPDATE ON profile_views
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
