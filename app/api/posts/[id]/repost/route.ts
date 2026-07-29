import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { postReposts, posts } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";
export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(); if ("error" in auth) return fail(auth.error, 401);
    const [existing] = await db.select().from(postReposts).where(and(eq(postReposts.postId, params.id), eq(postReposts.userId, auth.userId))).limit(1);
    if (existing) { await db.delete(postReposts).where(and(eq(postReposts.postId, params.id), eq(postReposts.userId, auth.userId))); const rows = await db.select().from(postReposts).where(eq(postReposts.postId, params.id)); await db.update(posts).set({ repostsCount: rows.length }).where(eq(posts.id, params.id)); return ok({ reposted: false, reposts_count: rows.length }); }
    await db.insert(postReposts).values({ postId: params.id, userId: auth.userId }); const rows = await db.select().from(postReposts).where(eq(postReposts.postId, params.id)); await db.update(posts).set({ repostsCount: rows.length }).where(eq(posts.id, params.id)); return ok({ reposted: true, reposts_count: rows.length });
  } catch (error) { return serverError(error, "posts.repost"); }
}
