import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { createSession, hashPassword, verifyPassword } from "./auth";
import type { Db } from "./db";
import { claims, items, pledges, users, type Item, type ItemKind, type User } from "./db/schema";

// ---------- accounts ----------

const RESERVED_HANDLES = new Set([
  "admin", "api", "app", "login", "logout", "me", "signup", "settings", "help", "about", "u", "www",
]);

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name").max(80),
  email: z.email("That email doesn't look right").trim().toLowerCase(),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, "3–30 letters, numbers or dashes")
    .refine((h) => !RESERVED_HANDLES.has(h), "That link is reserved"),
  password: z.string().min(8, "At least 8 characters").max(200),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export async function signUp(db: Db, input: SignUpInput) {
  const existing = await db
    .select({ email: users.email, handle: users.handle })
    .from(users)
    .where(sql`${users.email} = ${input.email} or ${users.handle} = ${input.handle}`);
  if (existing.some((u) => u.email === input.email)) return { error: "email_taken" as const };
  if (existing.some((u) => u.handle === input.handle)) return { error: "handle_taken" as const };

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      handle: input.handle,
      passwordHash: await hashPassword(input.password),
    })
    .returning();
  return { user, session: await createSession(db, user.id) };
}

export async function logIn(db: Db, email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return { user, session: await createSession(db, user.id) };
}

// ---------- the owner's own items ----------

// http(s) only: these render as links and images on other people's screens.
const webUrl = z.url({ protocol: /^https?$/, error: "Links need to start with http:// or https://" }).max(2000).nullable();

export const itemSchema = z.object({
  kind: z.enum(["want", "have"]),
  title: z.string().trim().min(1, "Give it a name").max(200),
  url: webUrl,
  imageUrl: webUrl,
  priceCents: z.number().int().positive().nullable(),
  notes: z.string().trim().max(1000).nullable(),
  groupTargetCents: z.number().int().positive().nullable(),
});

export type ItemInput = z.infer<typeof itemSchema>;

export async function addItem(db: Db, userId: string, input: ItemInput): Promise<Item> {
  const [item] = await db
    .insert(items)
    .values({
      userId,
      ...input,
      // Only wants can be group-funded.
      groupTargetCents: input.kind === "want" ? input.groupTargetCents : null,
    })
    .returning();
  return item;
}

export async function deleteItem(db: Db, userId: string, itemId: string): Promise<void> {
  await db.delete(items).where(and(eq(items.id, itemId), eq(items.userId, userId)));
}

/** The owner's view: their items, with no claim or pledge data at all. */
export async function ownItems(db: Db, userId: string): Promise<Record<ItemKind, Item[]>> {
  const rows = await db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt));
  return { want: rows.filter((r) => r.kind === "want"), have: rows.filter((r) => r.kind === "have") };
}

// ---------- the public list, as a gifter sees it ----------

export type GifterWant = Item & {
  claim: { name: string; mine: boolean } | null;
  pledgedCents: number;
  pledgeCount: number;
  myPledgeCents: number;
};

export type PublicList = {
  owner: Pick<User, "id" | "name" | "handle">;
  isOwner: boolean;
  wants: GifterWant[];
  haves: Item[];
};

/**
 * Loads a list for display. When the viewer is the owner, every claim and pledge is
 * stripped so the surprise survives even if they peek at their own public page.
 */
export async function publicList(
  db: Db,
  handle: string,
  viewer: { userId: string | null; gifterHash: string | null },
): Promise<PublicList | null> {
  const [owner] = await db
    .select({ id: users.id, name: users.name, handle: users.handle })
    .from(users)
    .where(eq(users.handle, handle.toLowerCase()));
  if (!owner) return null;

  const isOwner = viewer.userId === owner.id;
  const rows = await db.select().from(items).where(eq(items.userId, owner.id)).orderBy(desc(items.createdAt));
  const wantRows = rows.filter((r) => r.kind === "want");
  const haves = rows.filter((r) => r.kind === "have");

  const blank = (i: Item): GifterWant => ({ ...i, claim: null, pledgedCents: 0, pledgeCount: 0, myPledgeCents: 0 });
  if (isOwner || wantRows.length === 0) return { owner, isOwner, wants: wantRows.map(blank), haves };

  const ids = wantRows.map((r) => r.id);
  const [claimRows, pledgeRows] = await Promise.all([
    db.select().from(claims).where(inArray(claims.itemId, ids)),
    db.select().from(pledges).where(inArray(pledges.itemId, ids)).orderBy(asc(pledges.createdAt)),
  ]);

  const wants = wantRows.map((item) => {
    const c = claimRows.find((r) => r.itemId === item.id);
    const ps = pledgeRows.filter((p) => p.itemId === item.id);
    return {
      ...item,
      claim: c ? { name: c.name, mine: c.gifterHash === viewer.gifterHash } : null,
      pledgedCents: ps.reduce((sum, p) => sum + p.amountCents, 0),
      pledgeCount: ps.length,
      myPledgeCents: ps.filter((p) => p.gifterHash === viewer.gifterHash).reduce((s, p) => s + p.amountCents, 0),
    };
  });
  return { owner, isOwner, wants, haves };
}

// ---------- gifter actions ----------

export const gifterSchema = z.object({
  name: z.string().trim().min(1, "Add your name so others know it's handled").max(80),
  email: z.union([z.email().trim().toLowerCase(), z.literal("").transform(() => null)]).nullable(),
});

type GifterInput = z.infer<typeof gifterSchema>;
type ActionError = "not_found" | "own_item" | "not_claimable" | "taken" | "over_target";

async function wantFor(db: Db, itemId: string, viewerUserId: string | null) {
  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item || item.kind !== "want") return { error: "not_found" as const };
  if (item.userId === viewerUserId) return { error: "own_item" as const };
  return { item };
}

export async function claimItem(
  db: Db,
  itemId: string,
  gifter: GifterInput,
  gifterHash: string,
  viewerUserId: string | null,
): Promise<{ ok: true } | { error: ActionError }> {
  const found = await wantFor(db, itemId, viewerUserId);
  if (!found.item) return { error: found.error };
  if (found.item.groupTargetCents) return { error: "not_claimable" };

  // The unique index on item_id settles races: the second insert simply does nothing.
  const inserted = await db
    .insert(claims)
    .values({ itemId, name: gifter.name, email: gifter.email, gifterHash })
    .onConflictDoNothing()
    .returning({ id: claims.id });
  return inserted.length ? { ok: true } : { error: "taken" };
}

export async function unclaimItem(db: Db, itemId: string, gifterHash: string): Promise<boolean> {
  const deleted = await db
    .delete(claims)
    .where(and(eq(claims.itemId, itemId), eq(claims.gifterHash, gifterHash)))
    .returning({ id: claims.id });
  return deleted.length > 0;
}

export async function pledgeToItem(
  db: Db,
  itemId: string,
  gifter: GifterInput & { amountCents: number },
  gifterHash: string,
  viewerUserId: string | null,
): Promise<{ ok: true; remainingCents: number } | { error: ActionError; remainingCents?: number }> {
  return db.transaction(async (tx) => {
    // Lock the item row so concurrent pledges can't overshoot the target together.
    const [item] = await tx.select().from(items).where(eq(items.id, itemId)).for("update");
    if (!item || item.kind !== "want") return { error: "not_found" as const };
    if (item.userId === viewerUserId) return { error: "own_item" as const };
    if (!item.groupTargetCents) return { error: "not_claimable" as const };

    const [{ total }] = await tx
      .select({ total: sql<number>`coalesce(sum(${pledges.amountCents}), 0)::int` })
      .from(pledges)
      .where(eq(pledges.itemId, itemId));
    const remaining = item.groupTargetCents - total;
    if (gifter.amountCents > remaining) return { error: "over_target" as const, remainingCents: remaining };

    await tx.insert(pledges).values({
      itemId,
      name: gifter.name,
      email: gifter.email,
      amountCents: gifter.amountCents,
      gifterHash,
    });
    return { ok: true as const, remainingCents: remaining - gifter.amountCents };
  });
}

export async function withdrawPledges(db: Db, itemId: string, gifterHash: string): Promise<void> {
  await db.delete(pledges).where(and(eq(pledges.itemId, itemId), eq(pledges.gifterHash, gifterHash)));
}
