import { db } from "@/lib/db/client";
import { jobs, savedJobs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.id, params.id), eq(jobs.isActive, true))).limit(1);
    if (!job) return fail("job_not_found", 404);
    await db.insert(savedJobs).values({ userId: auth.userId, jobId: job.id }).onConflictDoNothing();
    return ok({ saved: true });
  } catch (error) {
    return serverError(error, "jobs.save");
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    await db.delete(savedJobs).where(and(eq(savedJobs.userId, auth.userId), eq(savedJobs.jobId, params.id)));
    return ok({ saved: false });
  } catch (error) {
    return serverError(error, "jobs.unsave");
  }
}
