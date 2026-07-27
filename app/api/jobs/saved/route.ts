import { db } from "@/lib/db/client";
import { savedJobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const rows = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userId, auth.userId));
    return ok(rows.map((row) => row.jobId));
  } catch (error) {
    return serverError(error, "jobs.saved.list");
  }
}
