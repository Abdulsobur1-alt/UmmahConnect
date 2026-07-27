import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail } from "@/lib/api/helpers";
import { userDto } from "@/lib/api/mappers";
import { profileUpdateFields } from "@/lib/profile/update";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorised", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Keep this endpoint's response consistent with every other user endpoint.
  // Drizzle rows use camelCase property names, while the client API contract
  // uses snake_case (for example, full_name).
  if (!user) {
    return fail("profile_not_found", 404);
  }

  return ok(userDto(user));
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail("Unauthorised", 401);
    }

    const body = await req.json();

    const update = profileUpdateFields(body);
    if (Object.keys(update).length === 0) return fail("no_valid_fields", 400);
    update.updatedAt = new Date();

    await db
      .update(users)
      .set(update as any)
      .where(eq(users.id, session.user.id));

    return ok({ success: true });
  } catch (error) {
    console.error("[PROFILE UPDATE ERROR]", error);
    return fail("profile_update_failed", 500);
  }
}
