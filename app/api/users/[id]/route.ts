import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { userDto } from "@/lib/api/mappers";
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
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!data[0]) return fail("not_found", 404);
    return ok(userDto(data[0] as any));
  } catch {
    return serverError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const body = await request.json();

    // Allow admins to ban/unban users
    const isBanAction = body.is_banned !== undefined || body.isBanned !== undefined;
    if (isBanAction) {
      const [admin] = await db
        .select({ isAdmin: users.isAdmin })
        .from(users)
        .where(eq(users.id, auth.userId))
        .limit(1);
      if (!admin?.isAdmin) return fail("forbidden", 403);

      const [updated] = await db
        .update(users)
        .set({ isBanned: body.is_banned ?? body.isBanned, updatedAt: new Date() })
        .where(eq(users.id, params.id))
        .returning();
      if (!updated) return fail("user_not_found", 404);
      return ok({ banned: updated.isBanned });
    }

    // For non-ban updates, only the user themselves can edit
    if (auth.userId !== params.id) return fail("forbidden", 403);

    const update: Record<string, unknown> = {};
    if (body.full_name !== undefined) update.fullName = body.full_name;
    if (body.fullName !== undefined) update.fullName = body.fullName;
    if (body.industry !== undefined) update.industry = body.industry;
    if (body.career_stage !== undefined) update.careerStage = body.career_stage;
    if (body.city !== undefined) update.city = body.city;
    if (body.bio !== undefined) update.bio = body.bio;
    if (body.skills !== undefined) update.skills = body.skills;
    if (body.show_photo !== undefined) update.showPhoto = body.show_photo;
    if (body.open_to_opportunities !== undefined)
      update.openToOpportunities = body.open_to_opportunities;
    if (body.banner_url !== undefined) update.bannerUrl = body.banner_url;
    if (body.avatar_url !== undefined) update.avatarUrl = body.avatar_url;
    update.updatedAt = new Date();

    const updated = await db
      .update(users)
      .set(update as any)
      .where(eq(users.id, params.id))
      .returning();

    if (!updated[0]) return fail("update_failed", 400);
    return ok(userDto(updated[0] as any));
  } catch {
    return serverError();
  }
}
