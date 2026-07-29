import { db } from "@/lib/db/client";
import { connections, users } from "@/lib/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { eq, and, or } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

const requesterAlias = alias(users, "requester_user");
const receiverAlias = alias(users, "receiver_user");

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
      .from(connections)
      .leftJoin(requesterAlias, eq(requesterAlias.id, connections.requesterId))
      .leftJoin(receiverAlias, eq(receiverAlias.id, connections.receiverId))
      .where(
        and(
          or(
            eq(connections.requesterId, params.id),
            eq(connections.receiverId, params.id),
          ),
          eq(connections.status, "accepted"),
        ),
      );

    // Map connections to include the connected user's profile
    const enriched = (data ?? []).map((row: any) => {
      const connection = row.connections;
      const isRequester = connection.requesterId === params.id;
      const connectedUser = isRequester ? row.receiver_user : row.requester_user;
      return {
        id: connection.id,
        connected_user_id: isRequester ? connection.receiverId : connection.requesterId,
        connected_user_name: connectedUser?.fullName ?? "Unknown",
        connected_user_industry: connectedUser?.industry ?? null,
        connected_user_avatar: connectedUser?.avatarUrl ?? null,
        created_at: connection.createdAt,
      };
    });

    return ok(enriched);
  } catch {
    return serverError();
  }
}
