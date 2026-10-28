import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url && process.env.NETLIFY) {
  console.error("DATABASE_URL is not set. Add it in Netlify's environment variables before deploying.");
  process.exit(1);
}
if (!url) {
  console.log("DATABASE_URL is not set; the local PGlite database migrates itself on first use.");
  process.exit(0);
}

const pool = new Pool({ connectionString: url, max: 1 });
await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
await pool.end();
console.log("Migrations applied.");
