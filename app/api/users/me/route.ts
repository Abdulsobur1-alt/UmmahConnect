import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail } from "@/lib/api/helpers";
import { userDto } from "@/lib/api/mappers";

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
  const session = await auth();
  if (!session?.user?.id) {
    return fail("Unauthorised", 401);
  }

  const body = await req.json();

  const allowed = [
    "name",
    "full_name",
    "fullName",
    "bio",
    "industry",
    "careerStage",
    "career_stage",
    "city",
    "skills",
    "openToOpportunities",
    "open_to_opportunities",
    "avatarUrl",
    "avatar_url",
    "bannerUrl",
    "banner_url",
    "showPhoto",
    "show_photo",
  ];

  const fieldMap: Record<string, string> = {
    name: "fullName",
    full_name: "fullName",
    fullName: "fullName",
    avatar_url: "avatarUrl",
    avatarUrl: "avatarUrl",
    banner_url: "bannerUrl",
    bannerUrl: "bannerUrl",
    career_stage: "careerStage",
    careerStage: "careerStage",
    open_to_opportunities: "openToOpportunities",
    openToOpportunities: "openToOpportunities",
    show_photo: "showPhoto",
    showPhoto: "showPhoto",
  };

  const update: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) continue;
    const dbKey = fieldMap[key] ?? key;
    update[dbKey] = body[key];
  }
  update.updatedAt = new Date().toISOString();

  await db
    .update(users)
    .set(update as any)
    .where(eq(users.id, session.user.id));

  return ok({ success: true });
}
