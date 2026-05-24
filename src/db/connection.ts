import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL || "postgres://coffee_user:coffee_pass@localhost:5432/coffee_shop";

export const sql = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function testConnection(): Promise<void> {
  try {
    await sql`SELECT 1`;
    console.log("✓ Database connection established");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    throw error;
  }
}
