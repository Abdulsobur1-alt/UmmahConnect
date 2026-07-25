import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signupSchema } from "@/lib/validation";
import { withHandler, parseBody, ok, fail } from "@/lib/api/helpers";
import { createClient } from "@/lib/supabase/server";

export const POST = withHandler(async (req: NextRequest) => {
  const body = await parseBody(req, signupSchema);

  const industry =
    body.industry === "Other" && body.industry_custom
      ? body.industry_custom
      : body.industry;

  // Check if user already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (existing[0]) {
    return fail("email_taken", 409);
  }

  // Get the Supabase auth user ID from the session
  // The user is already authenticated via Supabase Auth by this point
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return fail("unauthorized", 401);
  }

  await db
    .insert(users)
    .values({
      id: authUser.id, // Use Supabase auth user ID as our user ID
      fullName: body.full_name,
      email: body.email,
      industry,
      careerStage: body.career_stage,
      city: body.city,
      country: "Nigeria",
      plan: body.plan,
    })
    .onConflictDoNothing({ target: users.email });

  return ok({ email: body.email }, 201);
});
