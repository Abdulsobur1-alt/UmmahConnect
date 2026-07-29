import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { announcements, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { isPremiumPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const data = await db.select({ announcement: announcements, author: users.fullName })
      .from(announcements).leftJoin(users, eq(announcements.authorId, users.id))
      .where(and(eq(announcements.status, "published"), or(isNull(announcements.expiresAt), gt(announcements.expiresAt, new Date()))))
      .orderBy(desc(announcements.createdAt)).limit(30);
    return ok(data.map(({ announcement, author }) => ({ ...announcement, author_name: author ?? "Ummah Connect member" })));
  } catch (error) { return serverError(error, "announcements.list"); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    if (!isPremiumPlan(auth.plan)) return fail("premium_required", 403);
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const kind = ["event", "workshop", "class", "announcement"].includes(body.kind) ? body.kind : "announcement";
    if (!title || !text) return fail("title_and_body_required", 400);
    const [created] = await db.insert(announcements).values({ authorId: auth.userId, title, body: text, kind, location: body.location?.trim() || null, ctaUrl: body.cta_url?.trim() || null, startsAt: body.starts_at ? new Date(body.starts_at) : null, expiresAt: body.expires_at ? new Date(body.expires_at) : null }).returning();
    return ok(created, 201);
  } catch (error) { return serverError(error, "announcements.create", request); }
}
