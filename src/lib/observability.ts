type ErrorLike = { message?: string; code?: string; cause?: { code?: string; message?: string } };

export function requestId(request?: Request) {
  return request?.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function logApiError(input: { route: string; error: unknown; request?: Request; userId?: string }) {
  const error = (input.error ?? {}) as ErrorLike;
  console.error(JSON.stringify({
    level: "error",
    event: "api_error",
    route: input.route,
    request_id: requestId(input.request),
    user_id: input.userId ?? null,
    error_code: error.code ?? error.cause?.code ?? null,
    error_message: error.message ?? error.cause?.message ?? "unknown_error",
  }));
}

export function logEvent(input: { event: string; userId?: string; properties?: Record<string, unknown> }) {
  console.info(JSON.stringify({ level: "info", event: input.event, user_id: input.userId ?? null, properties: input.properties ?? {} }));
}
