import { auth as clerkAuth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type AuthContext = {
  /** DB-internal UUID */
  userId: string;
  /** Clerk user ID (user_xxx) */
  clerkId: string;
  email: string;
  plan: string;
};

/**
 * Authenticate the current request.
 * Looks up the user by clerkId first, falls back to email for legacy users.
 * Returns the DB UUID as `userId` (not the Clerk ID).
 */
export async function requireAuth(): Promise<
  AuthContext | { error: "unauthorized" }
> {
  const { userId: clerkId } = await clerkAuth();
  if (!clerkId) return { error: "unauthorized" };

  // Look up by clerkId (new records)
  let [profile] = await db
    .select({ id: users.id, email: users.email, plan: users.plan })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  // Fall back to looking up by the session claims if we have user info
  if (!profile) {
    const session = await clerkAuth();
    const sessionClaims = session?.sessionClaims as
      | { email?: string }
      | undefined;
    const email =
      sessionClaims?.email ??
      (await getEmailFromClerkUser(clerkId));

    if (email) {
      [profile] = await db
        .select({ id: users.id, email: users.email, plan: users.plan })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      // Link clerkId for future lookups
      if (profile) {
        await db
          .update(users)
          .set({ clerkId })
          .where(eq(users.id, profile.id))
          .catch(() => {});
      }
    }
  }

  if (!profile) return { error: "unauthorized" };

  return {
    userId: profile.id,
    clerkId,
    email: profile.email,
    plan: profile.plan ?? "free",
  };
}

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

async function getEmailFromClerkUser(clerkId: string): Promise<string | null> {
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();
    return user?.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}
