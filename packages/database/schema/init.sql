-- Creating tables for Miharina MVP with Madagascar-specific requirements

-- Table: users
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL CHECK (phone_number ~ '^\+261[0-9]{9}$'),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    preferred_language VARCHAR(2) CHECK (preferred_language IN ('fr', 'mg', 'en')) DEFAULT 'fr',
    is_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) CHECK (role IN ('entrepreneur', 'admin', 'partner')) DEFAULT 'entrepreneur',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id)
);

-- Table: business_profiles
CREATE TABLE business_profiles (
    business_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
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
    created_by UUID REFERENCES users(user_id)
);

-- Table: opportunities
CREATE TABLE opportunities (
    opportunity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_by UUID REFERENCES users(user_id)
);

-- Table: matches
CREATE TABLE matches (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(business_id),
    opportunity_id UUID NOT NULL REFERENCES opportunities(opportunity_id),
    match_score NUMERIC(5, 2) CHECK (match_score BETWEEN 0 AND 100),
    match_reason TEXT,
    status VARCHAR(20) CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),
    UNIQUE (business_id, opportunity_id)
);

-- Table: messages
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(user_id),
    receiver_id UUID NOT NULL REFERENCES users(user_id),
    match_id UUID REFERENCES matches(match_id),
    content TEXT NOT NULL,
    original_language VARCHAR(2) CHECK (original_language IN ('fr', 'mg', 'en')),
    translated_content JSONB, -- Stores translations
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id)
);

-- Table: success_stories
CREATE TABLE success_stories (
    story_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES business_profiles(business_id),
    title_fr VARCHAR(255) NOT NULL,
    title_mg VARCHAR(255),
    title_en VARCHAR(255),
    content_fr TEXT NOT NULL,
    content_mg TEXT,
    content_en TEXT,
    media_urls JSONB, -- Stores photo/video URLs
    status VARCHAR(20) CHECK (status IN ('draft', 'pending', 'published', 'archived')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id)
);

-- Indexes for performance optimization
CREATE INDEX idx_users_phone_number ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX idx_business_profiles_region ON business_profiles(region);
CREATE INDEX idx_business_profiles_business_type ON business_profiles(business_type);
CREATE INDEX idx_opportunities_business_type ON opportunities(business_type);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_matches_business_id ON matches(business_id);
CREATE INDEX idx_matches_opportunity_id ON matches(opportunity_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_success_stories_business_id ON success_stories(business_id);
CREATE INDEX idx_success_stories_status ON success_stories(status);

-- Full-text search indexes
CREATE INDEX idx_business_profiles_search_fr ON business_profiles USING GIN (to_tsvector('french', name_fr || ' ' || description_fr));
CREATE INDEX idx_business_profiles_search_mg ON business_profiles USING GIN (to_tsvector('simple', name_mg || ' ' || description_mg));
CREATE INDEX idx_business_profiles_search_en ON business_profiles USING GIN (to_tsvector('english', name_en || ' ' || description_en));
CREATE INDEX idx_opportunities_search_fr ON opportunities USING GIN (to_tsvector('french', title_fr || ' ' || description_fr));
CREATE INDEX idx_opportunities_search_en ON opportunities USING GIN (to_tsvector('english', title_en || ' ' || description_en));

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_business_profiles_timestamp
    BEFORE UPDATE ON business_profiles
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_opportunities_timestamp
    BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_matches_timestamp
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_messages_timestamp
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_success_stories_timestamp
    BEFORE UPDATE ON success_stories
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Migration Down Script
-- DROP TRIGGER IF EXISTS update_success_stories_timestamp ON success_stories;
-- DROP TRIGGER IF EXISTS update_messages_timestamp ON messages;
-- DROP TRIGGER IF EXISTS update_matches_timestamp ON matches;
-- DROP TRIGGER IF EXISTS update_opportunities_timestamp ON opportunities;
-- DROP TRIGGER IF EXISTS update_business_profiles_timestamp ON business_profiles;
-- DROP TRIGGER IF EXISTS update_users_timestamp ON users;
-- DROP FUNCTION IF EXISTS update_timestamp;

-- DROP INDEX IF EXISTS idx_business_profiles_search_fr;
-- DROP INDEX IF EXISTS idx_business_profiles_search_mg;
-- DROP INDEX IF EXISTS idx_business_profiles_search_en;
-- DROP INDEX IF EXISTS idx_opportunities_search_fr;
-- DROP INDEX IF EXISTS idx_opportunities_search_en;
-- DROP INDEX IF EXISTS idx_users_phone_number;
-- DROP INDEX IF EXISTS idx_users_email;
-- DROP INDEX IF EXISTS idx_business_profiles_user_id;
-- DROP INDEX IF EXISTS idx_business_profiles_region;
-- DROP INDEX IF EXISTS idx_business_profiles_business_type;
-- DROP INDEX IF EXISTS idx_opportunities_business_type;
-- DROP INDEX IF EXISTS idx_opportunities_status;
-- DROP INDEX IF EXISTS idx_matches_business_id;
-- DROP INDEX IF EXISTS idx_matches_opportunity_id;
-- DROP INDEX IF EXISTS idx_matches_status;
-- DROP INDEX IF EXISTS idx_messages_sender_id;
-- DROP INDEX IF EXISTS idx_messages_receiver_id;
-- DROP INDEX IF EXISTS idx_messages_match_id;
-- DROP INDEX IF EXISTS idx_success_stories_business_id;
-- DROP INDEX IF EXISTS idx_success_stories_status;

-- DROP TABLE IF EXISTS success_stories;
-- DROP TABLE IF EXISTS messages;
-- DROP TABLE IF EXISTS matches;
-- DROP TABLE IF EXISTS opportunities;
-- DROP TABLE IF EXISTS business_profiles;
-- DROP TABLE IF EXISTS users;

-- Seed Data
INSERT INTO users (user_id, phone_number, email, password_hash, first_name, last_name, preferred_language, is_verified, role)
VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '+261320123456', 'admin@miharina.mg', '$2b$10$hashedpassword', 'Admin', 'Miharina', 'fr', TRUE, 'admin'),
    ('550e8400-e29b-41d4-a716-446655440001', '+261330123456', 'rana@farm.mg', '$2b$10$hashedpassword', 'Ranjana', 'Andria', 'mg', TRUE, 'entrepreneur');

INSERT INTO business_profiles (business_id, user_id, name_fr, name_mg, name_en, description_fr, description_mg, description_en, region, business_type, registration_number, export_interests, contact_phone, contact_email, currency, is_verified, verification_status)
VALUES
    ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', '550e8400-e29b-41d4-a716-446655440001', 'Ferme Ranjana', 'Toeram-pambolena Ranjana', 'Ranjana Farm', 'Production de vanille de qualité', 'Fambolena vanila tsara kalitao', 'High-quality vanilla production', 'Antananarivo', 'agricultural', 'REG123456', '{"countries": ["Mauritius", "South Africa"], "products": ["vanilla", "spices"]}', '+261330123456', 'rana@farm.mg', 'MGA', TRUE, 'approved');

INSERT INTO opportunities (opportunity_id, title_fr, title_mg, title_en, description_fr, description_mg, description_en, business_type, target_countries, industry, estimated_value, currency, expiration_date, status, created_by)
VALUES
    ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Exportation de vanille', 'Fanondranana vanila', 'Vanilla Export', 'Recherche de partenaires pour exportation de vanille', 'Mitady mpiara-miasa amin''ny fanondranana vanila', 'Seeking partners for vanilla export', 'agricultural', '{"countries": ["Mauritius"]}', 'Spices', 1000000.00, 'USD', '2026-01-01', 'active', '550e8400-e29b-41d4-a716-446655440000');