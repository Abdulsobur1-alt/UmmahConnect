import { db } from "@/lib/db/client";
import { communities } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db.select().from(communities);
    return ok(data ?? []);
  } catch {
    return serverError();
  }
}
