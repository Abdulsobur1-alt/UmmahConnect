import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { mentorshipRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);

    const data = await db
      .select()
      .from(mentorshipRequests)
      .where(
        eq(mentorshipRequests.menteeId, auth.userId),
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
    if (!body.mentor_id || !body.message)
      return fail("mentor_id_and_message_required", 400);

    const inserted = await db
      .insert(mentorshipRequests)
      .values({
        menteeId: auth.userId,
        mentorId: body.mentor_id,
        message: body.message,
      })
      .returning();

    if (!inserted[0]) return fail("create_failed", 400);
    return ok(inserted[0], 201);
  } catch {
    return serverError();
  }
}
