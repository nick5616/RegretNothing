import { mkdirSync, readFileSync } from "node:fs";
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
  // Both drivers expose the same query builder; the types differ only in result metadata.
  return drizzlePglite(client, { schema }) as unknown as Db;
}

// Survive Next.js dev hot reloads: a second PGlite on the same directory would fail to lock it.
const globalForDb = globalThis as unknown as { __rnDb?: Promise<Db>; __rnJournal?: string };
const JOURNAL = path.join(MIGRATIONS, "meta", "_journal.json");

export function getDb(): Promise<Db> {
  const forget = (err: unknown) => {
    // Don't cache a failure; let the next request retry.
    globalForDb.__rnDb = globalForDb.__rnJournal = undefined;
    throw err;
  };
  globalForDb.__rnDb ??= connect().catch(forget);

  // PGlite outlives code changes in dev, so migrate whenever the migration list changes, not just at startup.
  if (!process.env.DATABASE_URL) {
    const journal = readFileSync(JOURNAL, "utf8");
    if (globalForDb.__rnJournal !== journal) {
      globalForDb.__rnJournal = journal;
      globalForDb.__rnDb = globalForDb.__rnDb
        .then(async (db) => {
          await migratePglite(db as unknown as Parameters<typeof migratePglite>[0], { migrationsFolder: MIGRATIONS });
          return db;
        })
        .catch(forget);
    }
  }
  return globalForDb.__rnDb;
}

export { schema };
