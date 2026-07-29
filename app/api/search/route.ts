import { desc, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { announcements, communities, jobs, posts, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { publicProfileDto } from "@/lib/api/mappers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return ok({ users: [], communities: [], topics: [], jobs: [], announcements: [] });
    const pattern = `%${q}%`;
    const [members, communityRows, postRows, jobRows, announcementRows] = await Promise.all([
      db.select().from(users).where(or(ilike(users.fullName, pattern), ilike(users.industry, pattern), ilike(users.city, pattern))).limit(8),
      db.select().from(communities).where(or(ilike(communities.name, pattern), ilike(communities.description, pattern))).limit(6),
      db.select({ content: posts.content }).from(posts).where(ilike(posts.content, pattern)).orderBy(desc(posts.createdAt)).limit(20),
      db.select().from(jobs).where(or(ilike(jobs.title, pattern), ilike(jobs.industry, pattern), ilike(jobs.company, pattern))).limit(6),
      db.select().from(announcements).where(or(ilike(announcements.title, pattern), ilike(announcements.body, pattern), ilike(announcements.kind, pattern))).limit(6),
    ]);
    const tags = Array.from(new Set(postRows.flatMap((row) => row.content.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((tag) => tag.toLowerCase()))).slice(0, 8);
    return ok({ users: members.map(publicProfileDto), communities: communityRows, topics: tags, jobs: jobRows, announcements: announcementRows });
  } catch (error) { return serverError(error, "search"); }
}
