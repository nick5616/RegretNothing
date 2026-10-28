import { sql } from "drizzle-orm";
import type { Db } from "./db";
import { rateLimits } from "./db/schema";

/** Counts a hit against `key`. False once more than `limit` hits land inside one `windowSec` window. */
export async function allow(db: Db, key: string, limit: number, windowSec: number): Promise<boolean> {
  const fresh = sql`now() + ${windowSec} * interval '1 second'`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: fresh })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when "rate_limits"."reset_at" <= now() then 1 else "rate_limits"."count" + 1 end`,
        resetAt: sql`case when "rate_limits"."reset_at" <= now() then excluded.reset_at else "rate_limits"."reset_at" end`,
      },
    })
    .returning({ count: rateLimits.count });
  // Sweep old windows now and then so the table stays small without a cron job.
  if (Math.random() < 0.02) await db.delete(rateLimits).where(sql`${rateLimits.resetAt} < now() - interval '1 day'`);
  return row.count <= limit;
}
