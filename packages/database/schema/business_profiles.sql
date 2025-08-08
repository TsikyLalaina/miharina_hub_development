-- Schema for Business Profiles Table
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
    contact_phone VARCHAR(15) CHECK (contact_phone ~ '^\\+261[0-9]{9}$'),
    contact_email VARCHAR(255),
    website_url VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(20) CHECK (verification_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    currency VARCHAR(3) DEFAULT 'MGA' CHECK (currency IN ('MGA', 'USD', 'EUR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id)
);

-- Indexes
CREATE INDEX idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX idx_business_profiles_region ON business_profiles(region);
CREATE INDEX idx_business_profiles_business_type ON business_profiles(business_type);
