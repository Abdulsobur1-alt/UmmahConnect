import { and, eq, inArray, or } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { userDto } from "@/lib/api/mappers";
import { db } from "@/lib/db/client";
import { connections, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Members can only start a private conversation after both sides are connected. */
export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const relationships = await db
      .select({ requesterId: connections.requesterId, receiverId: connections.receiverId })
      .from(connections)
      .where(
        and(
          eq(connections.status, "accepted"),
          or(eq(connections.requesterId, auth.userId), eq(connections.receiverId, auth.userId)),
        ),
      );
    const memberIds = relationships.map((connection) =>
      connection.requesterId === auth.userId ? connection.receiverId : connection.requesterId,
    );
    if (memberIds.length === 0) return ok([]);

    const members = await db.select().from(users).where(inArray(users.id, memberIds));
    return ok(members.map(userDto));
  } catch (error) {
    return serverError(error, "messages.conversations");
  }
}
