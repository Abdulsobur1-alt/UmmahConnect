import { createClient } from "@/lib/supabase/server";

/**
 * Trigger a realtime event via Supabase Realtime broadcast.
 * Subscribes to the channel before sending.
 */
export async function triggerEvent(
  channel: string,
  event: string,
  data: unknown,
) {
  const supabase = await createClient();
  const realtimeChannel = supabase.channel(channel);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Channel subscription timed out"));
    }, 5000);

    realtimeChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        realtimeChannel.send({
          type: "broadcast",
          event,
          payload: data,
        });
        // Clean up after sending
        setTimeout(() => {
          supabase.removeChannel(realtimeChannel);
        }, 1000);
        resolve();
      } else if (status === "CHANNEL_ERROR") {
        clearTimeout(timeout);
        reject(new Error("Channel error"));
      }
    });
  });
}

/**
 * Trigger a realtime event using the service role key for admin broadcasts.
 */
export async function triggerAdminEvent(
  channel: string,
  event: string,
  data: unknown,
) {
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  const realtimeChannel = supabase.channel(channel);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Channel subscription timed out"));
    }, 5000);

    realtimeChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        realtimeChannel.send({
          type: "broadcast",
          event,
          payload: data,
        });
        setTimeout(() => {
          supabase.removeChannel(realtimeChannel);
        }, 1000);
        resolve();
      } else if (status === "CHANNEL_ERROR") {
        clearTimeout(timeout);
        reject(new Error("Channel error"));
      }
    });
  });
}
