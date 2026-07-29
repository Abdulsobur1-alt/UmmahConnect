import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { communityMembers, communities } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { isPremiumPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function POST(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    if (!isPremiumPlan(auth.plan)) return fail("premium_required", 403);

    // Check if already a member
    const existing = await db
      .select()
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, params.id),
          eq(communityMembers.userId, auth.userId),
        ),
      )
      .limit(1);

    if (existing[0]) return fail("already_member", 400);

    await db
      .insert(communityMembers)
      .values({ communityId: params.id, userId: auth.userId });

    // Update member count
    await db
      .update(communities)
      .set({ memberCount: sql`member_count + 1` })
      .where(eq(communities.id, params.id));

    return ok({ joined: true }, 201);
  } catch {
    return serverError();
  }
}
