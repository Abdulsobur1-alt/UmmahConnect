import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { jobs, messages, notifications, posts, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check 1: Environment variables
  checks["DATABASE_URL"] = process.env.DATABASE_URL ? "set" : "MISSING";
  checks["NEXT_PUBLIC_SUPABASE_URL"] = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING";
  checks["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING";

  // Check 2: Database connectivity and core product tables. This catches ORM
  // and database schema drift before it reaches a member-facing request.
  try {
    const [userRows, postRows, jobRows, messageRows, notificationRows] = await Promise.all([
      db.select({ id: users.id }).from(users).limit(1),
      db.select({ id: posts.id }).from(posts).limit(1),
      db.select({ id: jobs.id }).from(jobs).limit(1),
      db.select({ id: messages.id }).from(messages).limit(1),
      db.select({ id: notifications.id }).from(notifications).limit(1),
    ]);
    checks["database"] = `connected (${userRows.length > 0 ? "has data" : "empty"})`;
    checks["core_tables"] = `users:${userRows.length}, posts:${postRows.length}, jobs:${jobRows.length}, messages:${messageRows.length}, notifications:${notificationRows.length}`;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "unknown error";
    checks["database"] = `FAILED: ${errMsg}`;
  }

  // Check 3: Test specific user columns separately for clear diagnostics.
  const testCols = ["isBanned", "createdAt", "updatedAt", "bannerUrl", "avatarUrl", "skills", "plan", "showPhoto", "openToOpportunities"];
  for (const col of testCols) {
    try {
      const colRef = (users as any)[col];
      if (colRef) {
        await db.select({ v: colRef }).from(users).limit(1);
        checks[`col_${col}`] = "OK";
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      checks[`col_${col}`] = `FAILED: ${errMsg.substring(0, 120)}`;
    }
  }

  // Check 3: Health check only (auth requires cookies, skip for health)
  checks["auth"] = "supabase (check not included in health)";

  const allOk = Object.values(checks).every(
    (v) => !v.startsWith("FAILED") && !v.includes("MISSING"),
  );

  return NextResponse.json({
    status: allOk ? "healthy" : "degraded",
    checks,
  });
}
