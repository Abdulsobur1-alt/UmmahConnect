import { db } from "@/lib/db/client";
import { userBlocks, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    if (params.id === auth.userId) return fail("cannot_block_yourself", 400);
    const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, params.id)).limit(1);
    if (!target) return fail("user_not_found", 404);
    await db.insert(userBlocks).values({ blockerId: auth.userId, blockedId: params.id }).onConflictDoNothing();
    return ok({ blocked: true });
  } catch (error) {
    return serverError(error, "trust.block");
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    await db.delete(userBlocks).where(and(eq(userBlocks.blockerId, auth.userId), eq(userBlocks.blockedId, params.id)));
    return ok({ blocked: false });
  } catch (error) {
    return serverError(error, "trust.unblock");
  }
}
