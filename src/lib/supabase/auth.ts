import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type AuthContext = {
  /** DB-internal UUID (same as Supabase auth user ID) */
  userId: string;
  email: string;
  plan: string;
};

/**
 * Authenticate the current request using Supabase Auth.
 * Looks up the user in the DB by their Supabase auth user ID.
 * Returns the DB UUID as `userId`.
 */
export async function requireAuth(): Promise<
  AuthContext | { error: "unauthorized" }
> {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return { error: "unauthorized" };

    // Look up user in our public.users table by their Supabase auth ID
    const [profile] = await db
      .select({ id: users.id, email: users.email, plan: users.plan })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!profile) return { error: "unauthorized" };

    return {
      userId: profile.id,
      email: profile.email,
      plan: profile.plan ?? "free",
    };
  } catch {
    return { error: "unauthorized" };
  }
}

/**
 * Authenticate and also return the full user profile.
 */
export async function requireAuthWithProfile() {
  const auth = await requireAuth();
  if ("error" in auth) return auth;

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);

  if (!profile) return { error: "unauthorized" as const };

  return {
    ...auth,
    profile,
  };
}

/**
 * Get the current session user from client-side Supabase helper.
 * Used in client components.
 */
export type SessionUser = {
  id: string;
  email?: string;
  plan?: string;
} | null;
