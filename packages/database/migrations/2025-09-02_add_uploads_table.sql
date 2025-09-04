-- Create uploads table expected by apps/api/src/controllers/uploadController.ts
-- Columns used in code: id, user_id, file_url, file_type, file_name, uploaded_at
-- Delete uses: DELETE FROM uploads WHERE id = $1 AND user_id = $2 RETURNING file_url

-- Enable pgcrypto if using gen_random_uuid()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    CREATE EXTENSION pgcrypto;
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('profile','business','opportunity','document')),
  file_name TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uploads_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(user_id)
    ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_at ON public.uploads(uploaded_at DESC);
