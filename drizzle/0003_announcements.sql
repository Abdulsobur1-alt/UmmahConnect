CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "location" text,
  "starts_at" timestamptz,
  "cta_url" text,
  "status" text NOT NULL DEFAULT 'published',
  "expires_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "announcements_visibility_idx" ON "announcements" ("status", "expires_at", "created_at");
