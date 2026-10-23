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
      // 1. Check if galaxies table exists; if not, bootstrap base tables automatically
      const tableCheck = await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='galaxies';"
      );
      if (tableCheck.rows.length === 0) {
        console.log("🛠️ Bootstrapping base SQLite tables in ensureDatabaseSchema()...");
        await client.execute(`
          CREATE TABLE IF NOT EXISTS users (
            id text PRIMARY KEY NOT NULL,
            name text,
            email text NOT NULL UNIQUE,
            email_verified integer,
            image text,
            default_galaxy_id text,
            created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS accounts (
            user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type text NOT NULL,
            provider text NOT NULL,
            provider_account_id text NOT NULL,
            refresh_token text,
            access_token text,
            expires_at integer,
            token_type text,
            scope text,
            id_token text,
            session_state text,
            PRIMARY KEY(provider, provider_account_id)
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS sessions (
            session_token text PRIMARY KEY NOT NULL,
            user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires integer NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS verification_tokens (
            identifier text NOT NULL,
            token text NOT NULL,
            expires integer NOT NULL,
            PRIMARY KEY(identifier, token)
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS galaxies (
            id text PRIMARY KEY NOT NULL,
            name text NOT NULL,
            slug text,
            theme text DEFAULT 'milky-way' NOT NULL,
            icon text DEFAULT 'sparkles' NOT NULL,
            parent_pin text DEFAULT '1234' NOT NULL,
            timezone text DEFAULT 'America/New_York' NOT NULL,
            owner_id text REFERENCES users(id) ON DELETE SET NULL,
            join_code text UNIQUE,
            family_color text NOT NULL DEFAULT '#ef4444',
            family_avatar text NOT NULL DEFAULT 'planet',
            is_ephemeral integer NOT NULL DEFAULT 0,
            expires_at text,
            created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS galaxy_members (
            id text PRIMARY KEY NOT NULL,
            galaxy_id text NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
            user_id text REFERENCES users(id) ON DELETE CASCADE,
            display_name text NOT NULL,
            role text DEFAULT 'member' NOT NULL,
            color text DEFAULT '#8b5cf6' NOT NULL,
            avatar_icon text DEFAULT 'user' NOT NULL,
            star_balance integer DEFAULT 0 NOT NULL,
            is_kiosk_profile integer DEFAULT 0 NOT NULL,
            created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS calendars (
            id text PRIMARY KEY NOT NULL,
            galaxy_id text NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
            name text NOT NULL,
            color text DEFAULT '#8b5cf6' NOT NULL,
            description text,
            is_primary integer DEFAULT 0 NOT NULL,
            external_provider text DEFAULT 'local' NOT NULL,
            external_calendar_id text,
            sync_token text,
            last_synced_at text,
            created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS events (
            id text PRIMARY KEY NOT NULL,
            galaxy_id text NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
            calendar_id text REFERENCES calendars(id) ON DELETE CASCADE,
            member_id text REFERENCES galaxy_members(id) ON DELETE SET NULL,
            member_ids text,
            external_uid text,
            title text NOT NULL,
            description text,
            location text,
            start_time text NOT NULL,
            end_time text NOT NULL,
            is_all_day integer DEFAULT 0 NOT NULL,
            rrule text,
            exdates text,
            color_override text,
            created_by_agent_id text,
            created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS chores (
            id text PRIMARY KEY NOT NULL,
            galaxy_id text NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
            member_id text NOT NULL REFERENCES galaxy_members(id) ON DELETE CASCADE,
            title text NOT NULL,
            points integer DEFAULT 1 NOT NULL,
            recurrence_type text DEFAULT 'daily' NOT NULL,
            days_of_week text DEFAULT '1,2,3,4,5,6,7',
            due_time text,
            is_active integer DEFAULT 1 NOT NULL,
            created_by_agent_id text,
            created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS chore_completions (
            id text PRIMARY KEY NOT NULL,
            chore_id text NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
            member_id text NOT NULL REFERENCES galaxy_members(id) ON DELETE CASCADE,
            completed_date text NOT NULL,
            points_awarded integer DEFAULT 1 NOT NULL,
            created_by_agent_id text,
            completed_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS list_items (
            id text PRIMARY KEY NOT NULL,
            galaxy_id text NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
            list_type text DEFAULT 'grocery' NOT NULL,
            title text NOT NULL,
            is_completed integer DEFAULT 0 NOT NULL,
            added_by_member_id text REFERENCES galaxy_members(id) ON DELETE SET NULL,
            created_by_agent_id text,
            created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS meal_plans (
            id text PRIMARY KEY NOT NULL,
            galaxy_id text NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
            member_id text REFERENCES galaxy_members(id) ON DELETE SET NULL,
            plan_date text NOT NULL,
            meal_type text DEFAULT 'dinner' NOT NULL,
            title text NOT NULL,
            notes text,
            recipe_url text,
            created_by_agent_id text,
            created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        await client.execute(`
          CREATE TABLE IF NOT EXISTS display_devices (
            id text PRIMARY KEY NOT NULL,
            galaxy_id text REFERENCES galaxies(id) ON DELETE CASCADE,
            device_name text DEFAULT 'Wall Tablet' NOT NULL,
            pairing_code text,
            is_paired integer DEFAULT 0 NOT NULL,
            current_mode text DEFAULT 'standard' NOT NULL,
            night_sleep_enabled integer DEFAULT 1 NOT NULL,
            sleep_start text DEFAULT '23:00' NOT NULL,
            sleep_end text DEFAULT '06:00' NOT NULL,
            last_active_at text DEFAULT CURRENT_TIMESTAMP NOT NULL
          );
        `);
        console.log("✅ Base SQLite tables bootstrapped.");
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

      // 5. Ensure family_color, family_avatar, is_ephemeral & expires_at columns in galaxies
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
      if (!galaxyCols.has("is_ephemeral")) {
        console.log("🛠️ Adding missing column 'is_ephemeral' to 'galaxies' table...");
        await client.execute("ALTER TABLE galaxies ADD COLUMN is_ephemeral integer NOT NULL DEFAULT 0;");
        console.log("✅ Added 'is_ephemeral' column to 'galaxies'.");
      }
      if (!galaxyCols.has("expires_at")) {
        console.log("🛠️ Adding missing column 'expires_at' to 'galaxies' table...");
        await client.execute("ALTER TABLE galaxies ADD COLUMN expires_at text;");
        console.log("✅ Added 'expires_at' column to 'galaxies'.");
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

/**
 * Spins down (deletes) all ephemeral Comets whose `expires_at` timestamp has passed.
 * Returns the list of spun-down Comet IDs.
 */
export async function purgeExpiredComets(nowIso?: string): Promise<string[]> {
  await ensureDatabaseSchema();
  const cutoff = nowIso || new Date().toISOString();
  try {
    const expiredRes = await client.execute({
      sql: "SELECT id FROM galaxies WHERE is_ephemeral = 1 AND expires_at IS NOT NULL AND expires_at <= ?;",
      args: [cutoff],
    });
    const expiredIds = expiredRes.rows.map((r) => String(r.id)).filter(Boolean);
    if (expiredIds.length === 0) return [];

    await client.execute("PRAGMA foreign_keys = ON;");
    for (const id of expiredIds) {
      await client.execute({ sql: "DELETE FROM events WHERE galaxy_id = ?;", args: [id] });
      await client.execute({ sql: "DELETE FROM list_items WHERE galaxy_id = ?;", args: [id] });
      await client.execute({ sql: "DELETE FROM chores WHERE galaxy_id = ?;", args: [id] });
      await client.execute({ sql: "DELETE FROM meal_plans WHERE galaxy_id = ?;", args: [id] });
      await client.execute({ sql: "DELETE FROM agent_keys WHERE galaxy_id = ?;", args: [id] });
      await client.execute({ sql: "DELETE FROM calendars WHERE galaxy_id = ?;", args: [id] });
      await client.execute({ sql: "DELETE FROM galaxy_members WHERE galaxy_id = ?;", args: [id] });
      await client.execute({ sql: "DELETE FROM galaxies WHERE id = ?;", args: [id] });
    }
    return expiredIds;
  } catch (err) {
    console.error("⚠️ Failed to purge expired comets:", err);
    return [];
  }
}
