import { db } from "@/lib/db/client";
import { reports, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 100) : "";
    const reportedUserId = typeof body.reported_user_id === "string" ? body.reported_user_id : null;
    if (!reason) return fail("report_reason_required", 400);
    if (reportedUserId === auth.userId) return fail("cannot_report_yourself", 400);
    await db.insert(reports).values({ reporterId: auth.userId, reportedUserId, reason, details: typeof body.details === "string" ? body.details.trim().slice(0, 1000) : null });
    return ok({ submitted: true }, 201);
  } catch (error) {
    return serverError(error, "reports.create");
  }
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const [user] = await db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, auth.userId)).limit(1);
    if (!user?.isAdmin) return fail("forbidden", 403);
    return ok(await db.select().from(reports).orderBy(desc(reports.createdAt)).limit(100));
  } catch (error) {
    return serverError(error, "reports.list");
  }
}
