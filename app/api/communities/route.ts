import { db } from "@/lib/db/client";
import { communities, communityMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { communityDto } from "@/lib/api/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select({ community: communities, memberId: communityMembers.userId })
      .from(communities)
      .leftJoin(
        communityMembers,
        and(
          eq(communities.id, communityMembers.communityId),
          eq(communityMembers.userId, auth.userId),
        ),
      );

    return ok(
      data.map(({ community, memberId }) => ({
        ...communityDto(community),
        is_joined: Boolean(memberId),
      })),
    );
  } catch {
    return serverError();
  }
}
