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
 * If the Supabase auth user exists but has no DB record, one is auto-created.
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

    if (profile) {
      return {
        userId: profile.id,
        email: profile.email,
        plan: profile.plan ?? "free",
      };
    }

    // Auto-create DB record for users who have a Supabase Auth account
    // but no corresponding DB record.
    // Signup form stores full_name, industry, career_stage, city in
    // user.user_metadata which are read here.
    const meta = user.user_metadata ?? {};
    const userEmail = user.email ?? `user-${user.id.slice(0, 8)}@placeholder.com`;
    const userName =
      meta.full_name ??
      meta.name ??
      userEmail.split("@")[0] ??
      "New Member";

    // Older accounts can have been created before Supabase became the source
    // of authentication. In that case the email is still the verified identity,
    // but the database UUID differs from the Supabase UUID. Reuse that profile
    // rather than allowing the unique-email insert to no-op and returning a
    // user ID for which no profile exists.
    const [legacyProfile] = await db
      .select({ id: users.id, email: users.email, plan: users.plan })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (legacyProfile) {
      return {
        userId: legacyProfile.id,
        email: legacyProfile.email,
        plan: legacyProfile.plan ?? "free",
      };
    }

    await db
      .insert(users)
      .values({
        id: user.id,
        fullName: userName,
        email: userEmail,
        industry: meta.industry ?? null,
        careerStage: meta.career_stage ?? null,
        city: meta.city ?? null,
        country: "Nigeria",
        plan: "free",
      })
      .onConflictDoNothing(); // suppress any constraint violations — best-effort auto-create

    return {
      userId: user.id,
      email: userEmail,
      plan: "free",
    };
  } catch (error) {
    console.error(
      "[AUTO-CREATE ERROR]",
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? "(no stack)"}`
        : JSON.stringify(error, null, 2),
    );
    // Database and Supabase outages must reach the route handler as 500s;
    // returning "unauthorized" here falsely tells an authenticated member to log in.
    throw error;
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
