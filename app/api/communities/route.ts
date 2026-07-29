import { db } from "@/lib/db/client";
import { communities, communityMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { communityDto } from "@/lib/api/mappers";
import { isPremiumPlan } from "@/lib/plans";

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

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    if (!isPremiumPlan(auth.plan)) return fail("premium_required", 403);
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    if (!name) return fail("community_name_required", 400);
    const [community] = await db.insert(communities).values({ name, description: description || null }).returning();
    if (!community) return fail("create_failed", 400);
    await db.insert(communityMembers).values({ communityId: community.id, userId: auth.userId });
    await db.update(communities).set({ memberCount: 1 }).where(eq(communities.id, community.id));
    return ok({ ...communityDto(community), is_joined: true }, 201);
  } catch (error) {
    return serverError(error, "communities.create", request);
  }
}
