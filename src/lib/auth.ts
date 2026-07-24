import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function auth() {
  const { userId } = await clerkAuth();
  if (!userId) return null;

  const profile = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = await currentUser();
  if (!user) return null;

  return {
    user: {
      id: userId,
      email: user.emailAddresses[0]?.emailAddress ?? "",
      name:
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.emailAddresses[0]?.emailAddress?.split("@")[0] ?? "",
      plan: (profile[0] as { plan?: string })?.plan ?? "free",
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
