import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { initializePaystackTransaction } from "@/lib/api/paystack";
import { asRecord, stringValue } from "@/lib/api/parsing";
import { fail, ok, serverError } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRO_AMOUNTS: Record<string, number> = {
  NGN: 9_000_00,
  USD: 10_00,
};

const SPONSOR_AMOUNTS: Record<string, number> = {
  NGN: 49_000_00,
  USD: 50_00,
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("unauthorized", 401);

    const user = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user[0]?.email) return fail("unauthorized", 401);

    const body = asRecord(await request.json());
    const plan = stringValue(body.plan);
    const eventId = stringValue(body.event_id);
    const currency = stringValue(body.currency) || "NGN";
    const isSponsor = plan === "sponsor";
    if (plan !== "pro" && plan !== "sponsor") return fail("invalid_plan", 400);

    const amounts = isSponsor ? SPONSOR_AMOUNTS : PRO_AMOUNTS;
    const amountKobo = amounts[currency];
    if (!amountKobo) return fail("unsupported_currency", 400);

    const payment = await initializePaystackTransaction({
      email: user[0].email,
      amountKobo,
      currency,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/payments/verify`,
      metadata: {
        user_id: userId,
        plan,
        payment_type: isSponsor ? "event_sponsor" : "subscription",
        event_id: eventId ?? "",
      },
    });

    if (!payment.status || !payment.data?.authorization_url)
      return fail("payment_initialization_failed", 400);

    return ok({
      authorization_url: payment.data.authorization_url,
      reference: payment.data.reference,
    });
  } catch {
    return serverError();
  }
}
