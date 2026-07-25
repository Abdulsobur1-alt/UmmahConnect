import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { comments, posts } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, params.id))
      .orderBy(asc(comments.createdAt));

    return ok(data ?? []);
  } catch {
    return serverError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const body = await request.json();
    const content = body?.content;
    if (!content) return fail("content_required", 400);

    const inserted = await db
      .insert(comments)
      .values({ postId: params.id, userId: auth.userId, content })
      .returning();

    if (!inserted[0]) return fail("create_failed", 400);

    // Update comment count
    const countResult = await db
      .select({ count: comments.id })
      .from(comments)
      .where(eq(comments.postId, params.id));
    const count = countResult.length;

    await db
      .update(posts)
      .set({ commentsCount: count })
      .where(eq(posts.id, params.id));

    return ok(inserted[0], 201);
  } catch {
    return serverError();
  }
}
