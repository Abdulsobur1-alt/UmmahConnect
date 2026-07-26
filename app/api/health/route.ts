import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check 1: Environment variables
  checks["DATABASE_URL"] = process.env.DATABASE_URL ? "set" : "MISSING";
  checks["NEXT_PUBLIC_SUPABASE_URL"] = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING";
  checks["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING";

  // Check 2: Database connectivity
  try {
    const countResult = await db
      .select({ count: users.id })
      .from(users)
      .limit(1);
    checks["database"] = `connected (${countResult.length > 0 ? "has data" : "empty"})`;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : "unknown error";
    checks["database"] = `FAILED: ${errMsg}`;
  }

  // Check 3: Full users table SELECT (replicates /api/users/me query)
  try {
    const full = await db.select().from(users).limit(1);
    checks["users_select"] = `OK (${full.length} rows)`;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    checks["users_select"] = `FAILED: ${errMsg.substring(0, 200)}`;
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
