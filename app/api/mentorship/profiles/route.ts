import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { mentorshipProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select()
      .from(mentorshipProfiles)
      .leftJoin(users, eq(mentorshipProfiles.userId, users.id));

    return ok(data ?? []);
  } catch {
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const body = await request.json();

    // Check if profile exists
    const existing = await db
      .select()
      .from(mentorshipProfiles)
      .where(eq(mentorshipProfiles.userId, auth.userId))
      .limit(1);

    if (existing[0]) {
      // Update existing
      const updated = await db
        .update(mentorshipProfiles)
        .set({
          role: body.role ?? existing[0].role,
          industries: body.industries ?? existing[0].industries,
          languages: body.languages ?? existing[0].languages,
          valuesTags: body.values_tags ?? existing[0].valuesTags,
          careerStage: body.career_stage ?? existing[0].careerStage,
          bio: body.bio ?? existing[0].bio,
          yearsExperience: body.years_experience ?? existing[0].yearsExperience,
        })
        .where(eq(mentorshipProfiles.userId, auth.userId))
        .returning();

      return ok(updated[0]);
    }

    // Create new
    const inserted = await db
      .insert(mentorshipProfiles)
      .values({
        userId: auth.userId,
        role: body.role ?? "mentor",
        industries: body.industries ?? [],
        languages: body.languages ?? [],
        valuesTags: body.values_tags ?? [],
        careerStage: body.career_stage ?? null,
        bio: body.bio ?? null,
        yearsExperience: body.years_experience ?? null,
      })
      .returning();

    if (!inserted[0]) return fail("create_failed", 400);
    return ok(inserted[0], 201);
  } catch {
    return serverError();
  }
}
