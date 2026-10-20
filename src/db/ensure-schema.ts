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

      // 5. Ensure family_color & family_avatar columns in galaxies
      if (!galaxyCols.has("family_color")) {
        console.log("🛠️ Adding missing column 'family_color' to 'galaxies' table...");
        await client.execute("ALTER TABLE galaxies ADD COLUMN family_color text NOT NULL DEFAULT '#ef4444';");
        console.log("✅ Added 'family_color' column to 'galaxies'.");
      }
      if (!galaxyCols.has("family_avatar")) {
        console.log("🛠️ Adding missing column 'family_avatar' to 'galaxies' table...");
        await client.execute("ALTER TABLE galaxies ADD COLUMN family_avatar text NOT NULL DEFAULT 'planet';");
        console.log("✅ Added 'family_avatar' column to 'galaxies'.");
      }

      // 6. Ensure member_ids column in events
      const eventCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='events';"
      );
      if (eventCheck.rows.length > 0) {
        const eventInfo = await client.execute("PRAGMA table_info(events);");
        const eventCols = new Set(eventInfo.rows.map((r) => String(r.name)));
        if (!eventCols.has("member_ids")) {
          console.log("🛠️ Adding missing column 'member_ids' to 'events' table...");
          await client.execute("ALTER TABLE events ADD COLUMN member_ids text;");
          console.log("✅ Added 'member_ids' column to 'events'.");
        }
        if (!eventCols.has("exdates")) {
          console.log("🛠️ Adding missing column 'exdates' to 'events' table...");
          await client.execute("ALTER TABLE events ADD COLUMN exdates text;");
          console.log("✅ Added 'exdates' column to 'events'.");
        }
      }

      // 7. Ensure created_by_agent_id in domain tables
      const domainTables = [
        "events",
        "chores",
        "chore_completions",
        "list_items",
        "meal_plans",
      ];
      for (const tbl of domainTables) {
        const chk = await client.execute(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='${tbl}';`
        );
        if (chk.rows.length > 0) {
          const info = await client.execute(`PRAGMA table_info(${tbl});`);
          const cols = new Set(info.rows.map((r) => String(r.name)));
          if (!cols.has("created_by_agent_id")) {
            console.log(`🛠️ Adding 'created_by_agent_id' to '${tbl}'...`);
            await client.execute(
              `ALTER TABLE ${tbl} ADD COLUMN created_by_agent_id text;`
            );
          }
        }
      }

      // 8. Ensure agent_keys table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS agent_keys (
          id text PRIMARY KEY,
          galaxy_id text NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
          member_id text NOT NULL REFERENCES galaxy_members(id) ON DELETE CASCADE,
          created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
          token_hash text NOT NULL UNIQUE,
          key_prefix text NOT NULL,
          agent_name text NOT NULL,
          crew text,
          directive text,
          tag_mode text NOT NULL DEFAULT 'rune',
          rune text NOT NULL DEFAULT '◈',
          color text NOT NULL DEFAULT '#06b6d4',
          stencil_map text,
          scope text NOT NULL DEFAULT 'standard',
          status text NOT NULL DEFAULT 'active',
          action_count integer NOT NULL DEFAULT 0,
          last_used_at text,
          revoked_at text,
          created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS agent_keys_token_hash_unique ON agent_keys (token_hash);"
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS agent_keys_galaxy_id_idx ON agent_keys (galaxy_id);"
      );

      // 9. Ensure agent_device_codes table
      await client.execute(`
        CREATE TABLE IF NOT EXISTS agent_device_codes (
          id text PRIMARY KEY,
          device_code_hash text NOT NULL UNIQUE,
          user_code text NOT NULL UNIQUE,
          agent_name text NOT NULL,
          crew text,
          directive text,
          tag_mode text NOT NULL DEFAULT 'rune',
          rune text NOT NULL DEFAULT '◈',
          color text NOT NULL DEFAULT '#06b6d4',
          stencil_map text,
          requested_scope text NOT NULL DEFAULT 'standard',
          status text NOT NULL DEFAULT 'pending',
          galaxy_id text REFERENCES galaxies(id) ON DELETE CASCADE,
          member_id text REFERENCES galaxy_members(id) ON DELETE CASCADE,
          minted_raw_token text,
          agent_key_id text REFERENCES agent_keys(id) ON DELETE SET NULL,
          expires_at integer NOT NULL,
          created_at text NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS agent_device_codes_code_hash_unique ON agent_device_codes (device_code_hash);"
      );
      await client.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS agent_device_codes_user_code_unique ON agent_device_codes (user_code);"
      );

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
