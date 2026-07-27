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
  const [recipient] = await db
    .select({ notificationSettings: users.notificationSettings })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  const settings = (recipient?.notificationSettings ?? {}) as Record<string, boolean>;
  const category = input.type.startsWith("connection") ? "connections"
    : input.type === "message_received" ? "messages"
    : input.type.startsWith("mentorship") ? "mentorship"
    : input.type === "job_match" ? "jobs"
    : input.type === "event_sponsored" ? "events"
    : undefined;
  if (category && settings[category] === false) return;
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
