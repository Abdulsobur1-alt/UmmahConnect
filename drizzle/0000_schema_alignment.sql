-- Keep the application schema aligned with the established Supabase enum.
-- `IF NOT EXISTS` makes this safe to apply to every environment.
ALTER TYPE "public"."notif_type" ADD VALUE IF NOT EXISTS 'payment_failed';
