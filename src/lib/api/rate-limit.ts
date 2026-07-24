import { db } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

type MemoryBucket = {
  count: number;
  windowStart: number;
};

const memoryBuckets = new Map<string, MemoryBucket>();

function key(identifier: string, action: string) {
  return `${action}:${identifier}`;
}

function tooMany(message = "Too many attempts. Try again later.") {
  return { limited: true as const, error: "too_many_requests", message };
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkMemoryLimit(
  identifier: string,
  action: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const bucketKey = key(identifier, action);
  const bucket = memoryBuckets.get(bucketKey);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    memoryBuckets.set(bucketKey, { count: 1, windowStart: now });
    return { limited: false as const, count: 1 };
  }
  if (bucket.count >= limit) return tooMany();
  bucket.count += 1;
  return { limited: false as const, count: bucket.count };
}

export async function checkRateLimit(input: {
  identifier: string;
  action: string;
  limit: number;
  windowMs: number;
}) {
  const { identifier, action, limit, windowMs } = input;
  const now = new Date();

  try {
    const existing = await db
      .select()
      .from(rateLimits)
      .where(
        and(
          eq(rateLimits.identifier, identifier),
          eq(rateLimits.action, action),
        ),
      )
      .limit(1);

    const existingRow = existing[0];
    const windowStart = existingRow?.windowStart
      ? new Date(existingRow.windowStart)
      : null;
    const expired =
      !windowStart || now.getTime() - windowStart.getTime() >= windowMs;
    const nextCount = expired ? 1 : (existingRow?.count ?? 0) + 1;

    if (!expired && nextCount > limit) return tooMany();

    if (existingRow) {
      await db
        .update(rateLimits)
        .set({
          count: nextCount,
          windowStart: expired ? now : existingRow.windowStart,
        })
        .where(
          and(
            eq(rateLimits.identifier, identifier),
            eq(rateLimits.action, action),
          ),
        );
    } else {
      await db.insert(rateLimits).values({
        identifier,
        action,
        count: nextCount,
        windowStart: now,
      });
    }

    return { limited: false as const, count: nextCount };
  } catch {
    return checkMemoryLimit(identifier, action, limit, windowMs);
  }
}
