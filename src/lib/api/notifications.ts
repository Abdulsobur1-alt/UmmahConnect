import { db } from "@/lib/db/client";
import { notifications, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "message_received"
  | "mentorship_request"
  | "mentorship_accepted"
  | "job_match"
  | "event_sponsored"
  | "post_liked"
  | "comment_received"
  | "payment_failed";

export async function notifyUser(input: {
  userId: string;
  type: NotificationType;
  content: string;
  referenceId?: string;
}) {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    content: input.content,
    referenceId: input.referenceId ?? null,
  });
}

export async function notifyUsersByIndustry(
  industry: string,
  content: string,
  referenceId?: string,
) {
  const userList = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.industry, industry));

  if (!userList || userList.length === 0) return;

  await db.insert(notifications).values(
    userList.map((u) => ({
      userId: u.id,
      type: "job_match" as NotificationType,
      content,
      referenceId: referenceId ?? null,
    })),
  );
}

export async function notifyAllUsers(
  content: string,
  referenceId?: string,
) {
  const userList = await db.select({ id: users.id }).from(users);
  if (!userList || userList.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < userList.length; i += chunkSize) {
    const chunk = userList.slice(i, i + chunkSize);
    await db.insert(notifications).values(
      chunk.map((u) => ({
        userId: u.id,
        type: "event_sponsored" as NotificationType,
        content,
        referenceId: referenceId ?? null,
      })),
    );
  }
}
