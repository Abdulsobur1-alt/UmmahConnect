import { NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { publicProfileDto } from "@/lib/api/mappers";
import { fail, ok, serverError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const data = await db
      .select()
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!data[0]) return fail("not_found", 404);
    return ok(publicProfileDto(data[0] as any));
  } catch {
    return serverError();
  }
}
