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

    // Ensure __drizzle_migrations table exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
      )
    `);

    const migRows = (
      await client.execute("SELECT created_at FROM __drizzle_migrations")
    ).rows;
    const appliedTimestamps = new Set(migRows.map((r) => Number(r.created_at)));

    // If accounts and galaxies tables already exist but migration 0000 is not recorded, baseline it
    if (
      existingTableNames.includes("accounts") &&
      existingTableNames.includes("galaxies") &&
      !appliedTimestamps.has(1790048740423)
    ) {
      console.log(
        "📝 Baselining initial schema (0000_gigantic_captain_flint) in __drizzle_migrations..."
      );
      await client.execute({
        sql: 'INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES (?, ?)',
        args: ["0000_gigantic_captain_flint", 1790048740423],
      });
      appliedTimestamps.add(1790048740423);
    }

    // If meal_plans table exists and has member_id column, baseline 0001
    if (
      existingTableNames.includes("meal_plans") &&
      !appliedTimestamps.has(1790211634347)
    ) {
      const mealCols = (
        await client.execute("PRAGMA table_info(meal_plans);")
      ).rows.map((r) => String(r.name));
      if (mealCols.includes("member_id")) {
        console.log(
          "📝 Baselining 0001_previous_nightmare in __drizzle_migrations..."
        );
        await client.execute({
          sql: 'INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES (?, ?)',
          args: ["0001_previous_nightmare", 1790211634347],
        });
        appliedTimestamps.add(1790211634347);
      }
    }

    // If galaxies table exists and has join_code column, baseline 0002
    if (
      existingTableNames.includes("galaxies") &&
      !appliedTimestamps.has(1790422315025)
    ) {
      const galaxyCols = (
        await client.execute("PRAGMA table_info(galaxies);")
      ).rows.map((r) => String(r.name));
      if (galaxyCols.includes("join_code")) {
        console.log(
          "📝 Baselining 0002_mean_barracuda in __drizzle_migrations..."
        );
        await client.execute({
          sql: 'INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES (?, ?)',
          args: ["0002_mean_barracuda", 1790422315025],
        });
        appliedTimestamps.add(1790422315025);
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
