import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getNextPrayer } from "@/lib/api/prayer";
import { ok, fail } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "Lagos";

  try {
    const prayer = await getNextPrayer(city);
    return ok(prayer);
  } catch {
    return fail("Failed to fetch prayer times", 500);
  }
}
