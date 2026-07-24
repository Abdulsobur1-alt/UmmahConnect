import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type AuthContext = {
  userId: string;
  email: string;
  plan: string;
};

export async function requireAuth(): Promise<
  AuthContext | { error: "unauthorized" }
> {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user?.emailAddresses[0]?.emailAddress) {
    return { error: "unauthorized" };
  }

  const profile = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    userId,
    email: user.emailAddresses[0].emailAddress,
    plan: profile[0]?.plan ?? "free",
  };
}

export async function requireAuthWithProfile() {
  const { userId } = await auth();
  if (!userId) {
    return { error: "unauthorized" as const };
  }

  const profile = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!profile[0]) {
    return { error: "unauthorized" as const };
  }

  return {
    userId,
    email: profile[0].email,
    profile: profile[0],
    plan: profile[0].plan,
  };
}
