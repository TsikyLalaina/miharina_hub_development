#!/usr/bin/env node

/**
 * Script to fix Firebase UID compatibility in database schema
 * Updates UUID columns to VARCHAR(128) for Firebase UID support
 */

const { Pool } = require('pg');
const path = require('path');

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'miharina_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const pool = new Pool(config);

async function fixSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing Firebase UID schema compatibility...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Drop existing constraints
    console.log('📋 Dropping existing constraints...');
    
    // Drop foreign key constraints
    await client.query(`
      ALTER TABLE IF EXISTS business_profiles DROP CONSTRAINT IF EXISTS business_profiles_user_id_fkey;
      ALTER TABLE IF EXISTS business_profiles DROP CONSTRAINT IF EXISTS business_profiles_created_by_fkey;
      ALTER TABLE IF EXISTS opportunities DROP CONSTRAINT IF EXISTS opportunities_created_by_fkey;
      ALTER TABLE IF EXISTS matches DROP CONSTRAINT IF EXISTS matches_created_by_fkey;
      ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
      ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
      ALTER TABLE IF EXISTS success_stories DROP CONSTRAINT IF EXISTS success_stories_created_by_fkey;
      ALTER TABLE IF EXISTS contact_requests DROP CONSTRAINT IF EXISTS contact_requests_sender_user_id_fkey;
      ALTER TABLE IF EXISTS contact_requests DROP CONSTRAINT IF EXISTS contact_requests_recipient_user_id_fkey;
      ALTER TABLE IF EXISTS profile_views DROP CONSTRAINT IF EXISTS profile_views_viewer_user_id_fkey;
    `);

    // Drop primary key and unique constraints
    await client.query(`
      ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_pkey;
      ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_phone_number_key;
      ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_email_key;
    `);

    // Alter table columns from UUID to VARCHAR(128)
    console.log('🔄 Altering column types...');
    
    // Users table
    await client.query(`
      ALTER TABLE IF EXISTS users 
      ALTER COLUMN user_id TYPE VARCHAR(128),
      ALTER COLUMN created_by TYPE VARCHAR(128);
    `);

    // Business profiles table
    await client.query(`
      ALTER TABLE IF EXISTS business_profiles 
      ALTER COLUMN business_id TYPE VARCHAR(128),
      ALTER COLUMN user_id TYPE VARCHAR(128),
      ALTER COLUMN created_by TYPE VARCHAR(128);
    `);

    // Opportunities table
    await client.query(`
      ALTER TABLE IF EXISTS opportunities 
      ALTER COLUMN opportunity_id TYPE VARCHAR(128),
      ALTER COLUMN created_by TYPE VARCHAR(128);
    `);

    // Matches table
    await client.query(`
      ALTER TABLE IF EXISTS matches 
      ALTER COLUMN match_id TYPE VARCHAR(128),
      ALTER COLUMN business_id TYPE VARCHAR(128),
      ALTER COLUMN opportunity_id TYPE VARCHAR(128),
      ALTER COLUMN created_by TYPE VARCHAR(128);
    `);

    // Messages table
    await client.query(`
      ALTER TABLE IF EXISTS messages 
      ALTER COLUMN message_id TYPE VARCHAR(128),
      ALTER COLUMN sender_id TYPE VARCHAR(128),
      ALTER COLUMN receiver_id TYPE VARCHAR(128),
      ALTER COLUMN created_by TYPE VARCHAR(128);
    `);

    // Success stories table
    await client.query(`
      ALTER TABLE IF EXISTS success_stories 
      ALTER COLUMN story_id TYPE VARCHAR(128),
      ALTER COLUMN business_id TYPE VARCHAR(128),
      ALTER COLUMN created_by TYPE VARCHAR(128);
    `);

    // Contact requests table
    await client.query(`
      ALTER TABLE IF EXISTS contact_requests 
      ALTER COLUMN id TYPE VARCHAR(128),
      ALTER COLUMN sender_user_id TYPE VARCHAR(128),
      ALTER COLUMN recipient_user_id TYPE VARCHAR(128),
      ALTER COLUMN target_business_id TYPE VARCHAR(128);
    `);

    // Profile views table
    await client.query(`
      ALTER TABLE IF EXISTS profile_views 
      ALTER COLUMN id TYPE VARCHAR(128),
      ALTER COLUMN business_id TYPE VARCHAR(128),
      ALTER COLUMN viewer_user_id TYPE VARCHAR(128);
    `);

    // Recreate primary key and unique constraints
    console.log('🔑 Recreating constraints...');
    await client.query(`
      ALTER TABLE users ADD PRIMARY KEY (user_id);
      ALTER TABLE users ADD UNIQUE (phone_number);
      ALTER TABLE users ADD UNIQUE (email);
    `);

    // Recreate foreign key constraints
    console.log('🔗 Recreating foreign key constraints...');
    await client.query(`
      ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
      ALTER TABLE business_profiles ADD CONSTRAINT business_profiles_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;

      ALTER TABLE opportunities ADD CONSTRAINT opportunities_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;

      ALTER TABLE matches ADD CONSTRAINT matches_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;

      ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE;
      ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey 
        FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE;

      ALTER TABLE success_stories ADD CONSTRAINT success_stories_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;

      ALTER TABLE contact_requests ADD CONSTRAINT contact_requests_sender_user_id_fkey 
        FOREIGN KEY (sender_user_id) REFERENCES users(user_id) ON DELETE CASCADE;
      ALTER TABLE contact_requests ADD CONSTRAINT contact_requests_recipient_user_id_fkey 
        FOREIGN KEY (recipient_user_id) REFERENCES users(user_id) ON DELETE CASCADE;

      ALTER TABLE profile_views ADD CONSTRAINT profile_views_viewer_user_id_fkey 
        FOREIGN KEY (viewer_user_id) REFERENCES users(user_id) ON DELETE SET NULL;
    `);

    // Recreate indexes
    console.log('📊 Recreating indexes...');
    await client.query(`
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
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Firebase UID schema compatibility fixed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixSchema()
  .then(() => {
    console.log('🎉 Schema migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Schema migration failed:', error);
    process.exit(1);
  });
