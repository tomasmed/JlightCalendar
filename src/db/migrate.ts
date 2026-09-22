import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function runMigration() {
  const url = process.env.DATABASE_URL || "file:./local.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  console.log(`🚀 Starting database migration on: ${url.replace(/:[^:]*@/, ":***@")}`);

  const client = createClient({
    url,
    authToken,
  });

  const db = drizzle(client);

  try {
    // Check if legacy unrecorded empty tables exist from previous raw drizzle-kit push
    const tablesResult = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const existingTableNames = tablesResult.rows.map((row) => String(row.name));

    // If legacy tables exist and __drizzle_migrations is empty, clean up empty legacy tables
    if (
      existingTableNames.includes("households") ||
      existingTableNames.includes("calendar_connections")
    ) {
      let migrationCount = 0;
      if (existingTableNames.includes("__drizzle_migrations")) {
        const migRes = await client.execute(
          "SELECT count(*) as count FROM __drizzle_migrations"
        );
        migrationCount = Number(migRes.rows[0]?.count ?? 0);
      }

      if (migrationCount === 0) {
        console.log(
          "🧹 Detected unrecorded legacy schema tables. Cleaning up empty legacy tables for pristine baseline..."
        );
        await client.execute("PRAGMA foreign_keys = OFF;");

        const legacyTablesToDrop = [
          "chore_completions",
          "chores",
          "list_items",
          "meal_plans",
          "events",
          "calendar_connections",
          "display_devices",
          "family_members",
          "households",
          "__drizzle_migrations",
        ];

        for (const tbl of legacyTablesToDrop) {
          try {
            await client.execute(`DROP TABLE IF EXISTS \`${tbl}\``);
          } catch (e) {
            // Ignore drop errors if table already dropped
          }
        }
        await client.execute("PRAGMA foreign_keys = ON;");
        console.log("✅ Legacy tables cleaned up.");
      }
    }

    const migrationsFolder = path.resolve(process.cwd(), "drizzle");
    console.log(`📦 Applying migrations from: ${migrationsFolder}`);

    await migrate(db, { migrationsFolder });

    console.log("✨ All migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
