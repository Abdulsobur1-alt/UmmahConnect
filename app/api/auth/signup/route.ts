import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signupSchema } from "@/lib/validation";
import { withHandler, parseBody, ok } from "@/lib/api/helpers";

export const POST = withHandler(async (req: NextRequest) => {
  const body = await parseBody(req, signupSchema);

  // Check if email already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, body.email))
    .limit(1);

  if (existing[0]) {
    throw { status: 409, message: "An account with this email already exists." };
  }

  const industry =
    body.industry === "Other" && body.industry_custom
      ? body.industry_custom
      : body.industry;

  await db.insert(users).values({
    fullName: body.full_name,
    email: body.email,
    industry,
    careerStage: body.career_stage,
    city: body.city,
    country: "Nigeria",
    plan: body.plan,
  });

  return ok({ email: body.email }, 201);
});
