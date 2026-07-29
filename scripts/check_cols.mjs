// Quick script to check database columns
const postgres = require("postgres");

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  try {
    const cols = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `;
    console.log("=== users table columns ===");
    for (const c of cols) {
      console.log("  " + c.column_name + " (" + c.data_type + ") nullable=" + c.is_nullable);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
  await sql.end();
}
main();
