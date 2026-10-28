import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzlePg<typeof schema>>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Production: real Postgres. Migrations run via `npm run db:migrate`.
    return drizzlePg(new Pool({ connectionString: url, max: 5 }), { schema });
  }
  // Serverless hosts have no lasting disk, so PGlite there would silently lose every list.
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error("DATABASE_URL is not set");
  }

  // Local dev and tests: embedded Postgres, migrated on first use.
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (dir !== "memory://") mkdirSync(dir, { recursive: true });
  const client = dir === "memory://" ? new PGlite() : new PGlite(dir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  // Both drivers expose the same query builder; the types differ only in result metadata.
  return db as unknown as Db;
}

// Survive Next.js dev hot reloads: a second PGlite on the same directory would fail to lock it.
const globalForDb = globalThis as unknown as { __rnDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.__rnDb ??= connect().catch((err) => {
    // Don't cache a failed connection; let the next request retry.
    globalForDb.__rnDb = undefined;
    throw err;
  });
  return globalForDb.__rnDb;
}

export { schema };
