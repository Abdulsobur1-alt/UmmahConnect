import { requireAuth as supabaseRequireAuth, requireAuthWithProfile as supabaseRequireAuthWithProfile } from "@/lib/supabase/auth";

/**
 * Re-export the Supabase-based auth helpers for backward compatibility
 * with all existing API route imports.
 */
export const requireAuth = supabaseRequireAuth;
export const requireAuthWithProfile = supabaseRequireAuthWithProfile;

export type AuthContext = {
  userId: string;
  email: string;
  plan: string;
};
