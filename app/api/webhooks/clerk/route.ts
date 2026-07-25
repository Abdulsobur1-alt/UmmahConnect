import crypto from "crypto";
import { Webhook } from "svix";
import { headers } from "next/headers";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET)
    return new Response("No webhook secret", { status: 400 });

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;
    const full_name = [first_name, last_name].filter(Boolean).join(" ") || "New Member";

    if (!email) return new Response("Missing email", { status: 400 });

    // Check if user already exists by email (from signup form)
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing[0]) {
      // Link Clerk ID to existing DB record
      await db
        .update(users)
        .set({ clerkId: id })
        .where(eq(users.id, existing[0].id));
    } else {
      // Create new user with auto-generated UUID and separate clerkId
      await db
        .insert(users)
        .values({
          id: crypto.randomUUID(),
          clerkId: id,
          fullName: full_name,
          email,
        })
        .onConflictDoNothing({ target: users.email });
    }
  }

  if (evt.type === "user.deleted") {
    const { id } = evt.data;
    await db
      .update(users)
      .set({ isBanned: true })
      .where(eq(users.clerkId, id));
  }

  return new Response("OK", { status: 200 });
}
