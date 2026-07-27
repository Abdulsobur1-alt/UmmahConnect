import { apiSend } from "@/lib/api/client";

export function trackMetric(event: string, properties: Record<string, unknown> = {}) {
  void apiSend("/api/metrics", "POST", { event, properties }).catch(() => {
    // Metrics must never affect a member-facing action.
  });
}
