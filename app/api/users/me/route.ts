import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users, subscriptions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ok, fail } from "@/lib/api/helpers";
import { userDto } from "@/lib/api/mappers";
import { profileUpdateFields } from "@/lib/profile/update";
import { isPremiumPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorised", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return fail("profile_not_found", 404);
  }

  // Fetch the most recent subscription record for this user
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const profile = userDto(user);

  return ok({
    ...profile,
    subscription_status: sub?.status ?? null,
    subscription_period_end: sub?.currentPeriodEnd?.toISOString() ?? null,
  });
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail("Unauthorised", 401);
    }

    const body = await req.json();

    // Chat appearance is a paid personalization feature. Keep this check on
    // the server so a free client cannot enable it by crafting a PATCH call.
    const notificationSettings = body?.notification_settings ?? body?.notificationSettings;
    if (
      notificationSettings &&
      typeof notificationSettings === "object" &&
      "message_theme" in notificationSettings &&
      !isPremiumPlan(session.user.plan)
    ) {
      return fail("premium_required", 403);
    }

    const update = profileUpdateFields(body);
    if (Object.keys(update).length === 0) return fail("no_valid_fields", 400);
    update.updatedAt = new Date();

    await db
      .update(users)
      .set(update as any)
      .where(eq(users.id, session.user.id));

    return ok({ success: true });
  } catch (error) {
    console.error("[PROFILE UPDATE ERROR]", error);
    return fail("profile_update_failed", 500);
  }
}
