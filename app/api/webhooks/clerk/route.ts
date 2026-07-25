import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Supabase Auth webhook handler.
 * Triggered when users are created/deleted in Supabase Auth.
 * Syncs the auth.users table to our public.users table.
 * 
 * Configure this webhook URL in Supabase Dashboard:
 *   Authentication → Webhooks → Add a new endpoint
 *   Events: user.created, user.deleted
 *   URL: {your-domain}/api/webhooks/clerk
 *   HTTP method: POST
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, record } = body;

    if (type === "INSERT" || type === "user.created") {
      const { id, email, raw_user_meta_data } = record || body;
      const userEmail = email || raw_user_meta_data?.email;
      const fullName = raw_user_meta_data?.full_name || 
        raw_user_meta_data?.name || 
        "New Member";

      if (!id || !userEmail) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Check if user already exists
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (!existing[0]) {
        // Create new user
        await db
          .insert(users)
          .values({
            id,
            fullName,
            email: userEmail,
          })
          .onConflictDoNothing({ target: users.id });
      }
    }

    if (type === "DELETE" || type === "user.deleted") {
      const { id } = record || body;
      if (id) {
        await db
          .update(users)
          .set({ isBanned: true })
          .where(eq(users.id, id));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
