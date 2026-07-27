import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { connections, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { notifyUser } from "@/lib/api/notifications";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const body = await request.json();
    const status = body?.status;
    if (status !== "accepted" && status !== "declined")
      return fail("invalid_status", 400);

    const updated = await db
      .update(connections)
      .set({ status })
      .where(eq(connections.id, params.id))
      .returning();

    if (!updated[0]) return fail("not_found", 404);

    if (status === "accepted" && updated[0].requesterId) {
      const sender = await db
        .select({ fullName: users.fullName })
        .from(users)
        .where(eq(users.id, auth.userId))
        .limit(1);

      await notifyUser({
        userId: updated[0].requesterId,
        type: "connection_accepted",
        content: `${sender[0]?.fullName ?? "Someone"} accepted your connection request`,
        referenceId: updated[0].id,
      });
    }

    return ok(updated[0]);
  } catch {
    return serverError();
  }
}
