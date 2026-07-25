import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { mentorshipRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
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
    if (!["pending", "accepted", "declined"].includes(status))
      return fail("invalid_status", 400);

    const updated = await db
      .update(mentorshipRequests)
      .set({ status })
      .where(eq(mentorshipRequests.id, params.id))
      .returning();

    if (!updated[0]) return fail("not_found", 404);
    return ok(updated[0]);
  } catch {
    return serverError();
  }
}
