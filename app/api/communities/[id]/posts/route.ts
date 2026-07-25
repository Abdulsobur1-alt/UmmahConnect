import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { posts, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select()
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.communityId, params.id))
      .orderBy(desc(posts.createdAt));

    return ok(data ?? []);
  } catch {
    return serverError();
  }
}
