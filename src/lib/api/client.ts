import type { ApiResult } from "@/lib/api/helpers";

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const json = (await response.json()) as ApiResult<T>;
  if (!response.ok || json.error) throw new Error(json.error ?? "request_failed");
  return json.data as T;
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await response.json()) as ApiResult<T>;
  if (!response.ok || json.error) throw new Error(json.error ?? "request_failed");
  return json.data as T;
}
