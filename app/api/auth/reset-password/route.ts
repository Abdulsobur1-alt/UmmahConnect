import { NextRequest } from "next/server";
import { withHandler, parseBody, ok } from "@/lib/api/helpers";
import { passwordResetSchema } from "@/lib/validation";

export const POST = withHandler(async (req: NextRequest) => {
  const body = await parseBody(req, passwordResetSchema);

  // Password reset is handled by Supabase Auth on the client side
  // This endpoint is kept for backward compatibility

  return ok({ sent: true });
});
