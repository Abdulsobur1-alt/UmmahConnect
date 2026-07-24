import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function auth() {
  const { userId } = await clerkAuth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress ?? "";

  // Look up user by email (unique) instead of by Clerk user ID
  // This avoids a schema migration since users.id is UUID but Clerk IDs are text
  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!profile) return null;

  return {
    user: {
      id: profile.id,
      email,
      name: profile.fullName,
      plan: profile.plan ?? "free",
    },
  };
}

export async function signIn(_email: string, _password: string) {
  return { error: "Use Clerk sign-in instead" };
}

export async function signUp(_input: {
  email: string;
  password: string;
  fullName: string;
  careerStage: string;
  city: string;
  country: string;
}) {
  return { error: "Use Clerk sign-up instead" };
}

export async function signOut() {
  return { error: null };
}
