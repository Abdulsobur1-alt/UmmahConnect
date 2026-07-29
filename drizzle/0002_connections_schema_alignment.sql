-- Connections are a core interaction path. Older production databases may
-- predate this audit field even though the application model includes it.
ALTER TABLE "connections"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();
