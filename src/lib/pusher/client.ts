// Client-side Supabase Realtime subscriptions
import { createClient } from "@/lib/supabase/client";

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (typeof window === "undefined") return null;
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

let realtimeChannels: Map<string, any> = new Map();

/**
 * Subscribe to a realtime channel for new messages.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  userId: string,
  onMessage: (payload: any) => void,
) {
  const supabase = getClient();
  if (!supabase) return () => {};

  const channelName = `user-${userId}`;

  // Clean up existing subscription
  const existing = realtimeChannels.get(channelName);
  if (existing) {
    supabase.removeChannel(existing);
  }

  const channel = supabase
    .channel(channelName)
    .on(
      "broadcast",
      { event: "new-message" },
      (payload: any) => {
        onMessage(payload.payload);
      },
    )
    .subscribe();

  realtimeChannels.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    realtimeChannels.delete(channelName);
  };
}

/**
 * Clean up all realtime subscriptions.
 */
export function cleanupAll() {
  const supabase = getClient();
  if (!supabase) return;
  realtimeChannels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  realtimeChannels.clear();
}
