import { db } from "@/lib/db/client";
import { productEvents } from "@/lib/db/schema";
import { requireAuth } from "@/lib/api/auth";
import { fail, ok, serverError } from "@/lib/api/helpers";
import { logEvent } from "@/lib/observability";

export const dynamic = "force-dynamic";
const allowedEvents = new Set(["profile_completed", "post_created", "message_sent", "job_saved", "job_application", "connection_requested", "onboarding_completed"]);

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return fail(auth.error, 401);
    const body = await request.json();
    const event = typeof body.event === "string" ? body.event : "";
    if (!allowedEvents.has(event)) return fail("invalid_metric_event", 400);
    const properties = body.properties && typeof body.properties === "object" && !Array.isArray(body.properties) ? body.properties : {};
    await db.insert(productEvents).values({ userId: auth.userId, event, properties });
    logEvent({ event, userId: auth.userId, properties });
    return ok({ tracked: true }, 201);
  } catch (error) {
    return serverError(error, "metrics.track");
  }
}
