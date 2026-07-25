import { ok } from "@/lib/api/helpers";

/**
 * Logout is handled entirely by Clerk.
 * This endpoint is kept for backward compatibility.
 */
export async function POST() {
  return ok({ success: true });
}
