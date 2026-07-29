import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const deleted = await db
      .delete(notifications)
      .where(and(eq(notifications.id, params.id), eq(notifications.userId, auth.userId)))
      .returning({ id: notifications.id });

    if (!deleted[0]) return fail("not_found", 404);
    return ok({ success: true });
  } catch (error) {
    return serverError(error, "notifications.delete");
  }
}
