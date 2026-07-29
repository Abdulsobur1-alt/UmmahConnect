import { db } from "@/lib/db/client";
import { connections, users } from "@/lib/db/schema";
import { and, eq, ne, or } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { userDto } from "@/lib/api/mappers";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const [candidates, existingConnections] = await Promise.all([
      db
      .select()
      .from(users)
      .where(and(ne(users.id, auth.userId), ne(users.email, auth.email)))
      .limit(50),
      db
        .select({ requesterId: connections.requesterId, receiverId: connections.receiverId })
        .from(connections)
        .where(or(eq(connections.requesterId, auth.userId), eq(connections.receiverId, auth.userId))),
    ]);

    const relatedUserIds = new Set(
      existingConnections.map((connection) =>
        connection.requesterId === auth.userId ? connection.receiverId : connection.requesterId,
      ),
    );
    const data = candidates.filter((user) => !relatedUserIds.has(user.id)).slice(0, 12);

    return ok((data ?? []).map(userDto as any));
  } catch {
    return serverError();
  }
}
