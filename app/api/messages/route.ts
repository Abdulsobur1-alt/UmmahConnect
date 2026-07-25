import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, auth.userId),
          eq(messages.receiverId, auth.userId),
        ),
      )
      .orderBy(desc(messages.createdAt));

    return ok(data ?? []);
  } catch {
    return serverError();
  }
}
