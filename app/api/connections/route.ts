import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { connections, users } from "@/lib/db/schema";
import { and, eq, or } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { notifyUser } from "@/lib/api/notifications";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select({
        id: connections.id,
        requester_id: connections.requesterId,
        receiver_id: connections.receiverId,
        status: connections.status,
        created_at: connections.createdAt,
      })
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
    if (receiverId === auth.userId) return fail("cannot_connect_with_yourself", 400);

    const [receiver] = await db
      .select({ id: users.id, allowConnectionRequests: users.allowConnectionRequests })
      .from(users)
      .where(eq(users.id, receiverId))
      .limit(1);
    if (!receiver) return fail("receiver_not_found", 404);
    if (!receiver.allowConnectionRequests) return fail("connection_requests_disabled", 403);

    const [existing] = await db
      .select({ id: connections.id })
      .from(connections)
      .where(
        or(
          and(eq(connections.requesterId, auth.userId), eq(connections.receiverId, receiverId)),
          and(eq(connections.requesterId, receiverId), eq(connections.receiverId, auth.userId)),
        ),
      )
      .limit(1);
    if (existing) return fail("connection_request_exists", 409);

    const inserted = await db
      .insert(connections)
      .values({ requesterId: auth.userId, receiverId })
      .returning({
        id: connections.id,
        requester_id: connections.requesterId,
        receiver_id: connections.receiverId,
        status: connections.status,
        created_at: connections.createdAt,
      });

    if (!inserted[0]) return fail("create_failed", 400);

    const sender = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, auth.userId))
      .limit(1);

    try {
      await notifyUser({
        userId: receiverId,
        type: "connection_request",
        content: `${sender[0]?.fullName ?? "Someone"} sent you a connection request`,
        referenceId: inserted[0].id,
      });
    } catch (error) {
      console.error("[CONNECTION NOTIFICATION ERROR]", error);
    }

    return ok(inserted[0], 201);
  } catch (error) {
    return serverError(error, "connections.create", request);
  }
}
