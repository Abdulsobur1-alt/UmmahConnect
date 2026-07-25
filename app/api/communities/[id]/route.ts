import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { communities, posts, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const communityData = await db
      .select()
      .from(communities)
      .where(eq(communities.id, params.id))
      .limit(1);

    if (!communityData[0]) return fail("not_found", 404);

    const postRows = await db
      .select()
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.communityId, params.id))
      .orderBy(desc(posts.createdAt))
      .limit(20);

    return ok({ community: communityData[0], posts: postRows ?? [] });
  } catch {
    return serverError();
  }
}
