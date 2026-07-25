import { NextResponse } from "next/server";

/**
 * Pusher auth endpoint — no longer needed since realtime is now handled
 * by Supabase Realtime. Kept for backward compatibility.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
