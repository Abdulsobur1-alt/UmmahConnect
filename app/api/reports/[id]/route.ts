import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const [admin] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, auth.userId)).limit(1);
    if (!admin?.isAdmin) return fail("forbidden", 403);
    const body = await request.json();
    const status = body.status === "resolved" || body.status === "dismissed" ? body.status : null;
    if (!status) return fail("invalid_status", 400);
    const [updated] = await db.update(reports).set({ status, reviewedBy: auth.userId, reviewedAt: new Date() }).where(eq(reports.id, params.id)).returning();
    if (!updated) return fail("report_not_found", 404);
    return ok(updated);
  } catch (error) {
    return serverError(error, "reports.review");
  }
}
