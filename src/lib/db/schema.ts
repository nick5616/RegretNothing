import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email), uniqueIndex("users_handle_idx").on(t.handle)],
);

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the cookie token; the raw token never touches the database.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const ITEM_KINDS = ["want", "have"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ItemKind>().notNull(),
    title: text("title").notNull(),
    url: text("url"),
    imageUrl: text("image_url"),
    priceCents: integer("price_cents"),
    notes: text("notes"),
    // When set, the item is funded by pledges instead of claimed outright.
    groupTargetCents: integer("group_target_cents"),
    createdAt: createdAt(),
  },
  (t) => [
    index("items_user_idx").on(t.userId, t.kind),
    check("items_kind_check", sql`${t.kind} in ('want', 'have')`),
    check("items_group_target_check", sql`${t.groupTargetCents} is null or ${t.groupTargetCents} > 0`),
  ],
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    // Hash of the gifter's browser token, so they can undo their own claim.
    gifterHash: text("gifter_hash").notNull(),
    createdAt: createdAt(),
  },
  // One claim per item, enforced by the database rather than a check-then-insert.
  (t) => [uniqueIndex("claims_item_idx").on(t.itemId)],
);

export const pledges = pgTable(
  "pledges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    amountCents: integer("amount_cents").notNull(),
    gifterHash: text("gifter_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("pledges_item_idx").on(t.itemId),
    check("pledges_amount_check", sql`${t.amountCents} > 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type Item = typeof items.$inferSelect;
