import { db } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

async function main() {
  try {
    const result = await db.select({ id: users.id }).from(users).limit(1);
    console.log("OK:", JSON.stringify(result));
  } catch (e: unknown) {
    const err = e as any;
    console.error("=== FULL ERROR ===");
    console.error("message:", err.message);
    console.error("cause:", JSON.stringify(err.cause ?? null, null, 2));
    console.error("query:", err.query);
    console.error("params:", err.params);
    if (err.cause) {
      const cause = err.cause as any;
      console.error("cause.code:", cause.code);
      console.error("cause.severity:", cause.severity);
      console.error("cause.routine:", cause.routine);
    }
  }
}

main();
