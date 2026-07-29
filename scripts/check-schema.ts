import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const expected: Record<string, string[]> = {
  users: ["id", "full_name", "email", "allow_connection_requests", "onboarding_completed", "notification_settings"],
  posts: ["id", "user_id", "content", "created_at"],
  jobs: ["id", "posted_by", "title", "created_at"],
  messages: ["id", "sender_id", "receiver_id", "content", "created_at"],
  notifications: ["id", "user_id", "type", "content"],
  connections: ["id", "requester_id", "receiver_id", "status", "created_at", "updated_at"],
  saved_jobs: ["user_id", "job_id", "created_at"],
  job_applications: ["id", "user_id", "job_id", "status"],
  user_blocks: ["blocker_id", "blocked_id"],
  reports: ["id", "reporter_id", "reason", "status"],
  product_events: ["id", "event", "properties", "created_at"],
  announcements: ["id", "author_id", "kind", "title", "body", "status", "created_at"],
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(JSON.stringify({ event: "schema_check_skipped", reason: "DATABASE_URL not configured" }));
    return;
  }
  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    const rows = await sql<{ table_name: string; column_name: string }[]>`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = any(${Object.keys(expected)})
    `;
    const actual = new Map<string, Set<string>>();
    for (const row of rows) actual.set(row.table_name, (actual.get(row.table_name) ?? new Set()).add(row.column_name));
    const missing = Object.entries(expected).flatMap(([table, columns]) =>
      columns.filter((column) => !actual.get(table)?.has(column)).map((column) => `${table}.${column}`),
    );
    if (missing.length) throw new Error(`Schema drift: ${missing.join(", ")}`);
    console.log(JSON.stringify({ event: "schema_check_passed", tables: Object.keys(expected) }));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ event: "schema_check_failed", message: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
