// Auth.js → Supabase Auth → Clerk.
// This route is a remnant of the old Auth.js setup and returns 404.
// Authentication is now handled entirely by Clerk.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Authentication is handled by Clerk." },
    { status: 404 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Authentication is handled by Clerk." },
    { status: 404 },
  );
}
