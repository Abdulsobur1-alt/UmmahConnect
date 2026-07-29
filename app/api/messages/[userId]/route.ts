import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { connections, messages, messageWeeklyCounts, users } from "@/lib/db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { mondayWeekStart } from "@/lib/api/business";
import { messageDto } from "@/lib/api/mappers";
import { notifyUser } from "@/lib/api/notifications";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { isFreePlan, isPremiumPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

async function hasAcceptedConnection(userId: string, otherUserId: string) {
  const [relationship] = await db
    .select({ id: connections.id })
    .from(connections)
    .where(
      and(
        eq(connections.status, "accepted"),
        or(
          and(eq(connections.requesterId, userId), eq(connections.receiverId, otherUserId)),
          and(eq(connections.requesterId, otherUserId), eq(connections.receiverId, userId)),
        ),
      ),
    )
    .limit(1);
  return Boolean(relationship);
}

export async function GET(
  _: Request,
  { params }: { params: { userId: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    if (!(await hasAcceptedConnection(auth.userId, params.userId))) return fail("connection_required", 403);

    const data = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, auth.userId), eq(messages.receiverId, params.userId)),
          and(eq(messages.senderId, params.userId), eq(messages.receiverId, auth.userId)),
        ),
      )
      .orderBy(asc(messages.createdAt));

    return ok((data ?? []).map(messageDto as any));
  } catch {
    return serverError();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) return fail("content_required", 400);
    if (params.userId === auth.userId) return fail("cannot_message_yourself", 400);
    if (!(await hasAcceptedConnection(auth.userId, params.userId))) return fail("connection_required", 403);

    const recipient = await db
      .select({ id: users.id, plan: users.plan })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1);
    if (!recipient[0]) return fail("recipient_not_found", 404);

    const premiumOutreachIsLimited = isFreePlan(auth.plan) && isPremiumPlan(recipient[0].plan);
    const weekStart = mondayWeekStart();

    // Check weekly limit
    const current = await db
      .select()
      .from(messageWeeklyCounts)
      .where(
        and(
          eq(messageWeeklyCounts.userId, auth.userId),
          eq(messageWeeklyCounts.weekStart, weekStart),
        ),
      )
      .limit(1);

    const count = current[0]?.count ?? 0;
    if (premiumOutreachIsLimited && count >= 10) return fail("premium_message_limit_reached", 403);

    const inserted = await db
      .insert(messages)
      .values({ senderId: auth.userId, receiverId: params.userId, content })
      .returning();

    if (!inserted[0]) return fail("send_failed", 400);

    // Upsert weekly count
    if (premiumOutreachIsLimited && current[0]) {
      await db
        .update(messageWeeklyCounts)
        .set({ count: count + 1 })
        .where(
          and(
            eq(messageWeeklyCounts.userId, auth.userId),
            eq(messageWeeklyCounts.weekStart, weekStart),
          ),
        );
    } else if (premiumOutreachIsLimited) {
      await db
        .insert(messageWeeklyCounts)
        .values({ userId: auth.userId, weekStart, count: 1 });
    }

    const sender = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    try {
      await notifyUser({
        userId: params.userId,
        type: "message_received",
        content: `New message from ${sender[0]?.fullName ?? "Someone"}`,
        referenceId: inserted[0].id,
      });
    } catch (error) {
      console.error("[MESSAGES NOTIFICATION ERROR]", error);
    }

    // Broadcast realtime event via Supabase Realtime
    try {
      const supabase = await createClient();
      await supabase.channel(`user-${params.userId}`).send({
        type: "broadcast",
        event: "new-message",
        payload: inserted[0],
      });
    } catch {
      // Realtime notification is best-effort
    }

    return ok(
      { message: messageDto(inserted[0] as any), weekly_count: premiumOutreachIsLimited ? count + 1 : count },
      201,
    );
  } catch (error) {
    return serverError(error, "messages.send");
  }
}
