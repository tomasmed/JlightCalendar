import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as dotenv from "dotenv";
import * as schema from "./schema";

if (process.env.JLIGHT_TEST_MODE !== "true") {
  dotenv.config({ path: ".env.local" });
  dotenv.config();
}

const url = process.env.DATABASE_URL || "file:./local.db";
const authToken = url.startsWith("file:") ? undefined : process.env.DATABASE_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;


