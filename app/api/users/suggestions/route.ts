import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { ne } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { userDto } from "@/lib/api/mappers";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select()
      .from(users)
      .where(ne(users.id, auth.userId))
      .limit(12);

    return ok((data ?? []).map(userDto as any));
  } catch {
    return serverError();
  }
}
