import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { eventListings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { eventDto } from "@/lib/api/mappers";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const inserted = await db
      .insert(eventListings)
      .values({
        sponsorId: body.sponsor_id,
        title: body.title,
        eventDate: body.event_date,
        locationType: body.location_type,
        description: body.description ?? null,
        locationDetail: body.location_detail ?? null,
        targetIndustry: body.target_industry ?? null,
        isActive: false,
        isPaid: false,
      })
      .returning();

    if (!inserted[0]) return fail("create_failed", 400);
    return ok(eventDto(inserted[0] as any), 201);
  } catch {
    return serverError();
  }
}
