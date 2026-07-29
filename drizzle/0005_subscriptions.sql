-- Add the subscriptions table for tracking premium Pro subscriptions via Paystack.
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan" text NOT NULL,
  "paystack_subscription_code" text UNIQUE,
  "paystack_customer_code" text,
  "paystack_reference" text UNIQUE,
  "status" text NOT NULL DEFAULT 'active',
  "current_period_start" timestamptz,
  "current_period_end" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- Speed up lookups by user_id (the most common query pattern)
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "subscriptions" ("user_id");
