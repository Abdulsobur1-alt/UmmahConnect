ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "reposts_count" integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS "post_reposts" (
  "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("post_id", "user_id")
);
