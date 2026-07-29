import { db } from "@/lib/db/client";
import { mentorshipProfiles, users } from "@/lib/db/schema";
import { eq, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { isPremiumPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    if (!isPremiumPlan(auth.plan)) return fail("premium_required", 403);

    const data = await db
      .select()
      .from(mentorshipProfiles)
      .leftJoin(users, eq(mentorshipProfiles.userId, users.id))
      .where(ne(mentorshipProfiles.userId, auth.userId))
      .limit(20);

    return ok(data ?? []);
  } catch {
    return serverError();
  }
}
