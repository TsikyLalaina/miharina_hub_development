-- Migration: add avatar_upload_id to users and opportunity_uploads join table
-- Created at: 2025-09-02

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    CREATE EXTENSION pgcrypto;
  END IF;
END$$;

-- 1) Add avatar_upload_id to users (nullable)
ALTER TABLE IF EXISTS public.users
  ADD COLUMN IF NOT EXISTS avatar_upload_id UUID
  REFERENCES public.uploads(id)
  ON DELETE SET NULL;

-- 2) Create opportunity_uploads join table for many-to-many attachments
CREATE TABLE IF NOT EXISTS public.opportunity_uploads (
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(opportunity_id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('hero','attachment')) DEFAULT 'attachment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (opportunity_id, upload_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_opportunity_uploads_opportunity_id ON public.opportunity_uploads(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_uploads_upload_id ON public.opportunity_uploads(upload_id);
