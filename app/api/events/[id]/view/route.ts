import { db } from "@/lib/db/client";
import { eventListings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(
  _: Request,
  { params }: { params: { id: string } },
) {
  try {
    const existing = await db
      .select()
      .from(eventListings)
      .where(eq(eventListings.id, params.id))
      .limit(1);

    if (!existing[0]) return fail("not_found", 404);

    await db
      .update(eventListings)
      .set({ viewsCount: (existing[0].viewsCount ?? 0) + 1 })
      .where(eq(eventListings.id, params.id));

    return ok({ viewed: true });
  } catch {
    return serverError();
  }
}
