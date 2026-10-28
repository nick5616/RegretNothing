import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { createSession, hashPassword, hashToken, newToken, verifyPassword } from "./auth";
import type { Db } from "./db";
import { claims, items, passwordResets, pledges, sessions, users, type Item, type ItemKind, type User } from "./db/schema";

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

const RESET_MINUTES = 60;

/** Issues a one-hour reset token for the account with this email, or null if there isn't one. */
export async function requestPasswordReset(db: Db, email: string): Promise<{ token: string; user: User } | null> {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  if (!user) return null;
  const token = newToken();
  await db.insert(passwordResets).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
  });
  return { token, user };
}

/** Sets a new password from a reset token, then signs out every device and starts a fresh session. */
export async function resetPassword(db: Db, token: string, password: string) {
  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.id, hashToken(token)), gt(passwordResets.expiresAt, new Date())));
  if (!reset) return null;
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, reset.userId));
  await db.delete(passwordResets).where(eq(passwordResets.userId, reset.userId));
  await db.delete(sessions).where(eq(sessions.userId, reset.userId));
  const [user] = await db.select().from(users).where(eq(users.id, reset.userId));
  return { user, session: await createSession(db, user.id) };
}

/** Deletes the account and everything on its list. Gifters' receipts for it go with it. */
export async function deleteAccount(db: Db, userId: string, password: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(password, user.passwordHash))) return false;
  await db.delete(users).where(eq(users.id, userId));
  return true;
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

export const itemEditSchema = itemSchema.omit({ kind: true });

/** Updates an item's details. A group gift's goal can change, but an item can't switch between claim and group. */
export async function updateItem(
  db: Db,
  userId: string,
  itemId: string,
  input: z.infer<typeof itemEditSchema>,
): Promise<boolean> {
  const { groupTargetCents, ...rest } = input;
  const updated = await db
    .update(items)
    .set({
      ...rest,
      groupTargetCents: sql`case when ${items.groupTargetCents} is null then null else coalesce(${groupTargetCents}::int, ${items.groupTargetCents}) end`,
    })
    .where(and(eq(items.id, itemId), eq(items.userId, userId), isNull(items.removedAt)))
    .returning({ id: items.id });
  return updated.length > 0;
}

/**
 * Takes an item off the list. It's hidden rather than deleted: the owner can't know whether someone
 * already bought it, and that gifter's receipt should say it was removed instead of vanishing.
 */
export async function deleteItem(db: Db, userId: string, itemId: string): Promise<void> {
  await db
    .update(items)
    .set({ removedAt: new Date() })
    .where(and(eq(items.id, itemId), eq(items.userId, userId), isNull(items.removedAt)));
}

/** The owner's view: their items, with no claim or pledge data at all. */
export async function ownItems(db: Db, userId: string): Promise<Record<ItemKind, Item[]>> {
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), isNull(items.removedAt)))
    .orderBy(desc(items.createdAt));
  return { want: rows.filter((r) => r.kind === "want"), have: rows.filter((r) => r.kind === "have") };
}

// ---------- the public list, as a gifter sees it ----------

export type GifterWant = Item & {
  /** receiptId is only set for the viewer's own claim. */
  claim: { name: string; mine: boolean; receiptId: string | null } | null;
  pledgedCents: number;
  pledgeCount: number;
  myPledgeCents: number;
  myReceiptId: string | null;
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
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, owner.id), isNull(items.removedAt)))
    .orderBy(desc(items.createdAt));
  const wantRows = rows.filter((r) => r.kind === "want");
  const haves = rows.filter((r) => r.kind === "have");

  const blank = (i: Item): GifterWant => ({ ...i, claim: null, pledgedCents: 0, pledgeCount: 0, myPledgeCents: 0, myReceiptId: null });
  if (isOwner || wantRows.length === 0) return { owner, isOwner, wants: wantRows.map(blank), haves };

  const ids = wantRows.map((r) => r.id);
  const [claimRows, pledgeRows] = await Promise.all([
    db.select().from(claims).where(inArray(claims.itemId, ids)),
    db.select().from(pledges).where(inArray(pledges.itemId, ids)).orderBy(asc(pledges.createdAt)),
  ]);

  const wants = wantRows.map((item) => {
    const c = claimRows.find((r) => r.itemId === item.id);
    const ps = pledgeRows.filter((p) => p.itemId === item.id);
    const mine = ps.filter((p) => p.gifterHash === viewer.gifterHash);
    const claimMine = !!c && c.gifterHash === viewer.gifterHash;
    return {
      ...item,
      claim: c ? { name: c.name, mine: claimMine, receiptId: claimMine ? c.id : null } : null,
      pledgedCents: ps.reduce((sum, p) => sum + p.amountCents, 0),
      pledgeCount: new Set(ps.map((p) => p.gifterHash)).size,
      myPledgeCents: mine.reduce((s, p) => s + p.amountCents, 0),
      myReceiptId: mine.at(-1)?.id ?? null,
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
  if (!item || item.kind !== "want" || item.removedAt) return { error: "not_found" as const };
  if (item.userId === viewerUserId) return { error: "own_item" as const };
  return { item };
}

export async function claimItem(
  db: Db,
  itemId: string,
  gifter: GifterInput,
  gifterHash: string,
  viewerUserId: string | null,
): Promise<{ ok: true; receiptId: string } | { error: ActionError }> {
  const found = await wantFor(db, itemId, viewerUserId);
  if (!found.item) return { error: found.error };
  if (found.item.groupTargetCents) return { error: "not_claimable" };

  // The unique index on item_id settles races: the second insert simply does nothing.
  const inserted = await db
    .insert(claims)
    .values({ itemId, name: gifter.name, email: gifter.email, gifterHash })
    .onConflictDoNothing()
    .returning({ id: claims.id });
  return inserted.length ? { ok: true, receiptId: inserted[0].id } : { error: "taken" };
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
): Promise<{ ok: true; remainingCents: number; receiptId: string } | { error: ActionError; remainingCents?: number }> {
  return db.transaction(async (tx) => {
    // Lock the item row so concurrent pledges can't overshoot the target together.
    const [item] = await tx.select().from(items).where(eq(items.id, itemId)).for("update");
    if (!item || item.kind !== "want" || item.removedAt) return { error: "not_found" as const };
    if (item.userId === viewerUserId) return { error: "own_item" as const };
    if (!item.groupTargetCents) return { error: "not_claimable" as const };

    const [{ total }] = await tx
      .select({ total: sql<number>`coalesce(sum(${pledges.amountCents}), 0)::int` })
      .from(pledges)
      .where(eq(pledges.itemId, itemId));
    const remaining = item.groupTargetCents - total;
    if (gifter.amountCents > remaining) return { error: "over_target" as const, remainingCents: remaining };

    const [pledge] = await tx
      .insert(pledges)
      .values({ itemId, name: gifter.name, email: gifter.email, amountCents: gifter.amountCents, gifterHash })
      .returning({ id: pledges.id });
    return { ok: true as const, remainingCents: remaining - gifter.amountCents, receiptId: pledge.id };
  });
}

export async function withdrawPledges(db: Db, itemId: string, gifterHash: string): Promise<void> {
  await db.delete(pledges).where(and(eq(pledges.itemId, itemId), eq(pledges.gifterHash, gifterHash)));
}

// ---------- receipts ----------
// A receipt's id is the claim or pledge id: random and shown nowhere else, so the link itself is the key.
// Whoever holds it can see the receipt and undo the gift, from any device.

export type Receipt = {
  kind: "claim" | "pledge";
  id: string;
  createdAt: Date;
  gifterName: string;
  gifterEmail: string | null;
  item: Item;
  owner: { name: string; handle: string };
  /** Pledges: this gifter's total on the item. Claims: the item's price, if known. */
  yourCents: number;
  othersCents: number;
  /** Pledges only: the goal. */
  targetCents: number;
  otherGifters: number;
};

const isUuid = (id: string) => z.uuid().safeParse(id).success;

export async function receipt(
  db: Db,
  id: string,
  viewerUserId: string | null,
): Promise<{ receipt: Receipt } | { error: "not_found" | "owner" }> {
  if (!isUuid(id)) return { error: "not_found" };
  const owner = { id: users.id, name: users.name, handle: users.handle };

  const [c] = await db
    .select({ claim: claims, item: items, owner })
    .from(claims)
    .innerJoin(items, eq(items.id, claims.itemId))
    .innerJoin(users, eq(users.id, items.userId))
    .where(eq(claims.id, id));
  if (c) {
    if (c.owner.id === viewerUserId) return { error: "owner" };
    return {
      receipt: {
        kind: "claim",
        id,
        createdAt: c.claim.createdAt,
        gifterName: c.claim.name,
        gifterEmail: c.claim.email,
        item: c.item,
        owner: c.owner,
        yourCents: c.item.priceCents ?? 0,
        othersCents: 0,
        targetCents: 0,
        otherGifters: 0,
      },
    };
  }

  const [p] = await db
    .select({ pledge: pledges, item: items, owner })
    .from(pledges)
    .innerJoin(items, eq(items.id, pledges.itemId))
    .innerJoin(users, eq(users.id, items.userId))
    .where(eq(pledges.id, id));
  if (!p) return { error: "not_found" };
  if (p.owner.id === viewerUserId) return { error: "owner" };
  const all = await db.select().from(pledges).where(eq(pledges.itemId, p.item.id));
  const yours = all.filter((x) => x.gifterHash === p.pledge.gifterHash);
  const others = all.filter((x) => x.gifterHash !== p.pledge.gifterHash);
  return {
    receipt: {
      kind: "pledge",
      id,
      createdAt: p.pledge.createdAt,
      gifterName: p.pledge.name,
      gifterEmail: p.pledge.email,
      item: p.item,
      owner: p.owner,
      yourCents: yours.reduce((s, x) => s + x.amountCents, 0),
      othersCents: others.reduce((s, x) => s + x.amountCents, 0),
      targetCents: p.item.groupTargetCents ?? 0,
      otherGifters: new Set(others.map((x) => x.gifterHash)).size,
    },
  };
}

/** Undoes the gift a receipt stands for: the claim, or all of that gifter's pledges on the item. */
export async function cancelByReceipt(db: Db, id: string): Promise<{ handle: string } | null> {
  if (!isUuid(id)) return null;
  const [c] = await db.delete(claims).where(eq(claims.id, id)).returning({ itemId: claims.itemId });
  let itemId = c?.itemId;
  if (!itemId) {
    const [p] = await db.select().from(pledges).where(eq(pledges.id, id));
    if (!p) return null;
    await db.delete(pledges).where(and(eq(pledges.itemId, p.itemId), eq(pledges.gifterHash, p.gifterHash)));
    itemId = p.itemId;
  }
  const [row] = await db
    .select({ handle: users.handle })
    .from(items)
    .innerJoin(users, eq(users.id, items.userId))
    .where(eq(items.id, itemId));
  return row ?? null;
}
