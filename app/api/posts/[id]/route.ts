import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { posts, comments, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { withHandler, ok, fail, serverError } from "@/lib/api/helpers";
import { postDto, publicProfileDto } from "@/lib/api/mappers";

export const dynamic = "force-dynamic";

export const GET = withHandler(async (_req: NextRequest, ctx?: unknown) => {
  const params = (ctx as { params: { id: string } }).params;

  const postResult = await db
    .select()
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .where(eq(posts.id, params.id))
    .limit(1);

  if (!postResult[0] || postResult[0].posts.isDeleted) {
    return fail("Post not found", 404);
  }

  const commentRows = await db
    .select()
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, params.id))
    .orderBy(asc(comments.createdAt));

  const commentList = (commentRows ?? []).map((row: any) => ({
    id: row.comments.id,
    post_id: row.comments.postId,
    user_id: row.comments.userId,
    content: row.comments.content,
    created_at: row.comments.createdAt ?? "",
    user: row.users ? publicProfileDto(row.users) : null,
  }));

  return ok({
    ...postDto({ ...postResult[0].posts, users: postResult[0].users } as any),
    comments: commentList,
  });
});

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    await db
      .update(posts)
      .set({ isDeleted: true })
      .where(and(eq(posts.id, params.id), eq(posts.userId, auth.userId)));

    return ok({ deleted: true });
  } catch {
    return serverError();
  }
}
