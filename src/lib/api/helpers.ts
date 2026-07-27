import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null, status }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { data: null, error: message, details: details ?? null, status },
    { status },
  );
}

export function serverError(error?: unknown, context = "api") {
  if (error) console.error(`[${context.toUpperCase()} ERROR]`, error);
  return fail("server_error", 500);
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw { status: 400, message: "Invalid JSON body" };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw {
      status: 400,
      message: "Validation failed",
      details: result.error.flatten(),
    };
  }
  return result.data;
}

export function withHandler(
  handler: (req: NextRequest, ctx?: unknown) => Promise<NextResponse>,
) {
  return async (req: NextRequest, ctx?: unknown) => {
    try {
      return await handler(req, ctx);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "status" in e) {
        const typed = e as { status: number; message: string; details?: unknown };
        return fail(typed.message, typed.status, typed.details ?? null);
      }
      console.error("[API Error]", e);
      return fail("Internal server error", 500);
    }
  };
}
