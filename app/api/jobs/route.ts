import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { jobs, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { jobDto } from "@/lib/api/mappers";
import { notifyUsersByIndustry } from "@/lib/api/notifications";
import { fail, ok, serverError } from "@/lib/api/helpers";

const jobTypes = new Set(["Full-time", "Part-time", "Contract", "Internship", "Hybrid"]);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const { searchParams } = new URL(request.url);
    const industry = searchParams.get("industry");

    let query = db
      .select()
      .from(jobs)
      .leftJoin(users, eq(jobs.postedBy, users.id))
      .where(eq(jobs.isActive, true))
      .orderBy(desc(jobs.createdAt));

    if (industry && industry !== "all") {
      query = db
        .select()
        .from(jobs)
        .leftJoin(users, eq(jobs.postedBy, users.id))
        .where(
          and(eq(jobs.isActive, true), eq(jobs.industry, industry)),
        )
        .orderBy(desc(jobs.createdAt));
    }

    const data = await query;
    return ok((data ?? []).map((row: any) => jobDto({ ...row.jobs, users: row.users })));
  } catch (error) {
    return serverError(error, "jobs.list");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    if (auth.plan !== "pro" && auth.plan !== "sponsor")
      return fail("pro_required", 403);

    const body = await request.json();
    if (!body.title || !body.company) return fail("title_and_company_required", 400);

    const jobType = typeof body.job_type === "string" && jobTypes.has(body.job_type)
      ? body.job_type as "Full-time" | "Part-time" | "Contract" | "Internship" | "Hybrid"
      : null;

    const inserted = await db
      .insert(jobs)
      .values({
        postedBy: auth.userId,
        title: body.title,
        company: body.company,
        description: body.description ?? null,
        industry: body.industry ?? null,
        location: body.location ?? null,
        isRemote: body.is_remote ?? false,
        jobType,
        careerStage: body.career_stage ?? null,
        salaryRange: body.salary_range ?? null,
        isHalalVerified: body.halal_confirmed ?? true,
      })
      .returning();

    if (!inserted[0]) return fail("create_failed", 400);

    if (body.industry) {
      try {
        await notifyUsersByIndustry(
          body.industry,
          `New job posted: ${body.title} at ${body.company}`,
          inserted[0].id,
        );
      } catch (error) {
        console.error("[JOBS NOTIFICATION ERROR]", error);
      }
    }

    return ok(jobDto(inserted[0] as any), 201);
  } catch (error) {
    return serverError(error, "jobs.create");
  }
}
