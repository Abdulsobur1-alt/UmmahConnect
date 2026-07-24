import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check 1: Environment variables
  checks["DATABASE_URL"] = process.env.DATABASE_URL ? "set" : "MISSING";
  checks["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    ? "set"
    : "MISSING";
  checks["CLERK_SECRET_KEY"] = process.env.CLERK_SECRET_KEY ? "set" : "MISSING";

  // Check 2: Database connectivity
  try {
    const countResult = await db
      .select({ count: users.id })
      .from(users)
      .limit(1);
    checks["database"] = `connected (${countResult.length > 0 ? "has data" : "empty"})`;
  } catch (e) {
    checks["database"] = `FAILED: ${e instanceof Error ? e.message : "unknown error"}`;
  }

  // Check 3: Auth
  try {
    const { userId } = await auth();
    checks["auth"] = userId ? `authenticated` : "no session (expected for health)";
  } catch (e) {
    checks["auth"] = `FAILED: ${e instanceof Error ? e.message : "unknown error"}`;
  }

  const allOk = Object.values(checks).every(
    (v) => !v.startsWith("FAILED") && !v.includes("MISSING"),
  );

  return NextResponse.json({
    status: allOk ? "healthy" : "degraded",
    checks,
  });
}
