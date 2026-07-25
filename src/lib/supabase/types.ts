/**
 * Supabase database type definitions.
 * Run `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`
 * to generate these from your Supabase project.
 *
 * For now we extend the base type to allow our existing Drizzle schema.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, any>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
    Enums: Record<string, any>;
  };
}
