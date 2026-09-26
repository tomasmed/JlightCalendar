import { client } from "./index";
import { generateJoinCode } from "./schema";

let isEnsured = false;
let ensuringPromise: Promise<void> | null = null;

/**
 * Ensures required database schema columns and indexes are present at runtime.
 * Idempotent, safe across server restarts and serverless lambdas.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (isEnsured) return;
  if (ensuringPromise) return ensuringPromise;

  ensuringPromise = (async () => {
    try {
      // 1. Check if galaxies table exists
      const tableCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='galaxies';"
      );
      if (tableCheck.rows.length === 0) {
        // Database tables not created yet, skip ALTER statements
        isEnsured = true;
        return;
      }

      // 2. Ensure join_code column in galaxies
      const galaxyInfo = await client.execute("PRAGMA table_info(galaxies);");
      const galaxyCols = new Set(galaxyInfo.rows.map((r) => String(r.name)));

      if (!galaxyCols.has("join_code")) {
        console.log("🛠️ Adding missing column 'join_code' to 'galaxies' table...");
        await client.execute("ALTER TABLE galaxies ADD COLUMN join_code text;");
        await client.execute(
          "CREATE UNIQUE INDEX IF NOT EXISTS galaxies_join_code_unique ON galaxies (join_code);"
        );

        // Backfill join_code for existing galaxies that have null
        const nullCodeRows = await client.execute(
          "SELECT id FROM galaxies WHERE join_code IS NULL;"
        );
        for (const row of nullCodeRows.rows) {
          const code = generateJoinCode();
          await client.execute({
            sql: "UPDATE galaxies SET join_code = ? WHERE id = ?",
            args: [code, row.id],
          });
        }
        console.log("✅ Added 'join_code' column and backfilled join codes.");
      }

      // 3. Ensure member_id column in meal_plans
      const mealCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='meal_plans';"
      );
      if (mealCheck.rows.length > 0) {
        const mealInfo = await client.execute("PRAGMA table_info(meal_plans);");
        const mealCols = new Set(mealInfo.rows.map((r) => String(r.name)));
        if (!mealCols.has("member_id")) {
          console.log("🛠️ Adding missing column 'member_id' to 'meal_plans' table...");
          await client.execute("ALTER TABLE meal_plans ADD COLUMN member_id text;");
          console.log("✅ Added 'member_id' column to 'meal_plans'.");
        }
      }

      // 4. Ensure default_galaxy_id column in users
      const userCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users';"
      );
      if (userCheck.rows.length > 0) {
        const userInfo = await client.execute("PRAGMA table_info(users);");
        const userCols = new Set(userInfo.rows.map((r) => String(r.name)));
        if (!userCols.has("default_galaxy_id")) {
          console.log("🛠️ Adding missing column 'default_galaxy_id' to 'users' table...");
          await client.execute("ALTER TABLE users ADD COLUMN default_galaxy_id text;");
          console.log("✅ Added 'default_galaxy_id' column to 'users'.");
        }
      }

      isEnsured = true;
    } catch (err) {
      console.error("⚠️ Failed to ensure database schema at runtime:", err);
      // Do not rethrow so subsequent operations can attempt execution
    } finally {
      ensuringPromise = null;
    }
  })();

  return ensuringPromise;
}
