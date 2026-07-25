import { db } from "@/lib/db/client";
import { postLikes, posts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    // Check if like exists
    const existing = await db
      .select()
      .from(postLikes)
      .where(
        and(
          eq(postLikes.postId, params.id),
          eq(postLikes.userId, auth.userId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      // Unlike
      await db
        .delete(postLikes)
        .where(
          and(
            eq(postLikes.postId, params.id),
            eq(postLikes.userId, auth.userId),
          ),
        );

      const countResult = await db
        .select({ count: postLikes.userId })
        .from(postLikes)
        .where(eq(postLikes.postId, params.id));
      const count = countResult.length;

      await db
        .update(posts)
        .set({ likesCount: count })
        .where(eq(posts.id, params.id));

      return ok({ liked: false, likes_count: count });
    }

    // Like
    await db
      .insert(postLikes)
      .values({ postId: params.id, userId: auth.userId });

    const countResult = await db
      .select({ count: postLikes.userId })
      .from(postLikes)
      .where(eq(postLikes.postId, params.id));
    const count = countResult.length;

    await db
      .update(posts)
      .set({ likesCount: count })
      .where(eq(posts.id, params.id));

    return ok({ liked: true, likes_count: count });
  } catch {
    return serverError();
  }
}
