import { db } from "@/lib/db/client";
import { messageWeeklyCounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { mondayWeekStart } from "@/lib/api/business";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const weekStart = mondayWeekStart();

    const data = await db
      .select()
      .from(messageWeeklyCounts)
      .where(
        and(
          eq(messageWeeklyCounts.userId, auth.userId),
          eq(messageWeeklyCounts.weekStart, weekStart),
        ),
      )
      .limit(1);

    const count = data[0]?.count ?? 0;
    return ok({
      week_start: weekStart,
      count,
      remaining: Math.max(0, 10 - count),
    });
  } catch {
    return serverError();
  }
}
