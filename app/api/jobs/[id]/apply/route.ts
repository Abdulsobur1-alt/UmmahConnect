import { db } from "@/lib/db/client";
import { jobApplications, jobs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { notifyUser } from "@/lib/api/notifications";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const [job] = await db.select().from(jobs).where(and(eq(jobs.id, params.id), eq(jobs.isActive, true))).limit(1);
    if (!job) return fail("job_not_found", 404);
    if (job.postedBy === auth.userId) return fail("cannot_apply_to_own_job", 400);
    const inserted = await db.insert(jobApplications).values({ userId: auth.userId, jobId: job.id }).onConflictDoNothing().returning();
    if (inserted[0]) {
      try {
        await notifyUser({ userId: job.postedBy, type: "job_match", content: `A member expressed interest in ${job.title}.`, referenceId: job.id });
      } catch (error) {
        console.error("[JOB APPLICATION NOTIFICATION ERROR]", error);
      }
    }
    return ok({ applied: true, already_applied: !inserted[0] });
  } catch (error) {
    return serverError(error, "jobs.apply");
  }
}
