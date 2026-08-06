import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDatabase = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
const sql = globalForDatabase.sql ?? postgres(databaseUrl, { max: 10 });

if (process.env.NODE_ENV !== "production") globalForDatabase.sql = sql;

export const db = drizzle(sql, { schema });
export async function closeDatabaseConnection() {
  await sql.end();
}
export { schema };
