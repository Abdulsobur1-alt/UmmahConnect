import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, auth.userId));

    return ok({ success: true });
  } catch {
    return serverError();
  }
}
