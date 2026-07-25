import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { connections, users } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { notifyUser } from "@/lib/api/notifications";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.requesterId, auth.userId),
          eq(connections.receiverId, auth.userId),
        ),
      );

    return ok(data ?? []);
  } catch {
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const body = await request.json();
    const receiverId = body?.receiver_id;
    if (!receiverId) return fail("receiver_required", 400);

    const inserted = await db
      .insert(connections)
      .values({ requesterId: auth.userId, receiverId })
      .returning();

    if (!inserted[0]) return fail("create_failed", 400);

    const sender = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    await notifyUser({
      userId: receiverId,
      type: "connection",
      content: `${sender[0]?.fullName ?? "Someone"} sent you a connection request`,
      referenceId: inserted[0].id,
    });

    return ok(inserted[0], 201);
  } catch {
    return serverError();
  }
}
