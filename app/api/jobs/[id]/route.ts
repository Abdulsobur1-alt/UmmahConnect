import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { jobs, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { jobDto } from "@/lib/api/mappers";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const data = await db
      .select()
      .from(jobs)
      .leftJoin(users, eq(jobs.postedBy, users.id))
      .where(eq(jobs.id, params.id))
      .limit(1);

    if (!data[0]) return fail("not_found", 404);

    // Increment view count
    await db
      .update(jobs)
      .set({ viewsCount: (data[0].jobs.viewsCount ?? 0) + 1 })
      .where(eq(jobs.id, params.id));

    return ok(jobDto({ ...data[0].jobs, users: data[0].users } as any));
  } catch {
    return serverError();
  }
}
