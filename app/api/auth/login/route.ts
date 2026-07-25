import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/helpers";

/**
 * Login is handled entirely by Clerk.
 * This endpoint is kept for backward compatibility.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return fail("Invalid email or password.", 401);
    }

    return ok({ success: true });
  } catch {
    return fail("Invalid email or password.", 401);
  }
}
