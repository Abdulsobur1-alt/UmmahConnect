import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, auth.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(20);

    return ok(data ?? []);
  } catch {
    return serverError();
  }
}
