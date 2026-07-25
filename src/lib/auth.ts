import { requireAuth } from "@/lib/api/auth";

/**
 * Legacy auth helper — delegates to the consolidated auth module.
 * Kept for backward compatibility with routes that still import from here.
 */
export async function auth() {
  const result = await requireAuth();
  if ("error" in result) return null;

  return {
    user: {
      id: result.userId,
      email: result.email,
      name: result.email,
      plan: result.plan,
    },
  };
}
