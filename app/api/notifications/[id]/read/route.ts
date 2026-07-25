import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, params.id),
          eq(notifications.userId, auth.userId),
        ),
      );

    return ok({ success: true });
  } catch {
    return serverError();
  }
}
