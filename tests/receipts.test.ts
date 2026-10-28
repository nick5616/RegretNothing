import { beforeAll, describe, expect, it } from "vitest";
import { getDb, type Db } from "@/lib/db";
import { userForSession } from "@/lib/auth";
import {
  addItem,
  cancelByReceipt,
  claimItem,
  deleteAccount,
  deleteItem,
  logIn,
  ownItems,
  pledgeToItem,
  publicList,
  receipt,
  requestPasswordReset,
  resetPassword,
  signUp,
  updateItem,
} from "@/lib/gifts";
import { shareWords } from "@/lib/money";
import { greetName } from "@/lib/names";
import { allow } from "@/lib/rateLimit";

let db: Db;
let ownerId: string;
const want = { kind: "want" as const, url: null, imageUrl: null, priceCents: null, notes: null, groupTargetCents: null };
const anon = { userId: null, gifterHash: null };

beforeAll(async () => {
  db = await getDb();
  const res = await signUp(db, { name: "Maya Chen", email: "maya@example.com", handle: "maya", password: "maya-password" });
  if ("error" in res) throw new Error(res.error);
  ownerId = res.user.id;
});

describe("shareWords", () => {
  it("says common fractions the way people do", () => {
    expect(shareWords(13000, 65000)).toBe("a fifth");
    expect(shareWords(25000, 50000)).toBe("half");
    expect(shareWords(2500, 10000)).toBe("a quarter");
    expect(shareWords(66667, 100000)).toBe("two thirds");
    expect(shareWords(3200, 10000)).toBe("about a third");
    expect(shareWords(5000, 5000)).toBe("all");
    expect(shareWords(7300, 100000)).toBe("7%");
    expect(shareWords(50, 100000)).toBe("a sliver");
  });
});

describe("greetName", () => {
  it("keeps family titles with the name", () => {
    expect(greetName("Aunt Jo")).toBe("Aunt Jo");
    expect(greetName("grandpa lou")).toBe("grandpa lou");
    expect(greetName("Robert Smith")).toBe("Robert");
    expect(greetName("  Cher ")).toBe("Cher");
  });
});

describe("receipts", () => {
  it("shows a claim's receipt to whoever has the link, but never to the list's owner", async () => {
    const item = await addItem(db, ownerId, { ...want, title: "Lodge skillet", priceCents: 3490 });
    const claim = await claimItem(db, item.id, { name: "Grandma Rose", email: "rose@example.com" }, "hash-rose", null);
    if (!("receiptId" in claim)) throw new Error("claim failed");

    const seen = await receipt(db, claim.receiptId, null);
    expect(seen).toMatchObject({ receipt: { kind: "claim", gifterName: "Grandma Rose", yourCents: 3490, owner: { handle: "maya" } } });
    expect(await receipt(db, claim.receiptId, ownerId)).toEqual({ error: "owner" });
    expect(await receipt(db, "not-a-uuid", null)).toEqual({ error: "not_found" });

    const list = await publicList(db, "maya", { userId: null, gifterHash: "hash-rose" });
    expect(list!.wants.find((w) => w.id === item.id)!.claim).toEqual({ name: "Grandma Rose", mine: true, receiptId: claim.receiptId });
    const other = await publicList(db, "maya", { userId: null, gifterHash: "hash-sam" });
    expect(other!.wants.find((w) => w.id === item.id)!.claim!.receiptId).toBeNull();
  });

  it("adds up a gifter's pledges and counts the people chipping in alongside them", async () => {
    const laptop = await addItem(db, ownerId, { ...want, title: "Laptop", groupTargetCents: 100000 });
    const first = await pledgeToItem(db, laptop.id, { name: "Grandpa", email: null, amountCents: 15000 }, "hash-gp", null);
    await pledgeToItem(db, laptop.id, { name: "Grandpa", email: null, amountCents: 5000 }, "hash-gp", null);
    await pledgeToItem(db, laptop.id, { name: "Aunt Jo", email: null, amountCents: 30000 }, "hash-jo", null);
    await pledgeToItem(db, laptop.id, { name: "Uncle Al", email: null, amountCents: 10000 }, "hash-al", null);
    if (!("receiptId" in first)) throw new Error("pledge failed");

    const r = await receipt(db, first.receiptId, null);
    expect(r).toMatchObject({ receipt: { kind: "pledge", yourCents: 20000, othersCents: 40000, targetCents: 100000, otherGifters: 2 } });
    const list = await publicList(db, "maya", anon);
    expect(list!.wants.find((w) => w.id === laptop.id)!.pledgeCount).toBe(3);
  });

  it("lets the receipt link undo the gift from any device", async () => {
    const item = await addItem(db, ownerId, { ...want, title: "Scarf" });
    const claim = await claimItem(db, item.id, { name: "Pat", email: null }, "hash-pat", null);
    if (!("receiptId" in claim)) throw new Error("claim failed");
    expect(await cancelByReceipt(db, claim.receiptId)).toEqual({ handle: "maya" });
    expect(await claimItem(db, item.id, { name: "Lee", email: null }, "hash-lee", null)).toMatchObject({ ok: true });

    const bike = await addItem(db, ownerId, { ...want, title: "Bike", groupTargetCents: 40000 });
    const p1 = await pledgeToItem(db, bike.id, { name: "Kim", email: null, amountCents: 1000 }, "hash-kim", null);
    await pledgeToItem(db, bike.id, { name: "Kim", email: null, amountCents: 2000 }, "hash-kim", null);
    await pledgeToItem(db, bike.id, { name: "Jo", email: null, amountCents: 4000 }, "hash-jo", null);
    if (!("receiptId" in p1)) throw new Error("pledge failed");
    await cancelByReceipt(db, p1.receiptId);
    const list = await publicList(db, "maya", anon);
    expect(list!.wants.find((w) => w.id === bike.id)!.pledgedCents).toBe(4000);
  });
});

describe("removing and editing items", () => {
  it("hides a removed item but keeps the gifter's receipt, marked removed", async () => {
    const item = await addItem(db, ownerId, { ...want, title: "Board game" });
    const claim = await claimItem(db, item.id, { name: "Rose", email: null }, "hash-rose", null);
    if (!("receiptId" in claim)) throw new Error("claim failed");
    await deleteItem(db, ownerId, item.id);

    expect((await ownItems(db, ownerId)).want.map((i) => i.id)).not.toContain(item.id);
    expect((await publicList(db, "maya", anon))!.wants.map((i) => i.id)).not.toContain(item.id);
    const r = await receipt(db, claim.receiptId, null);
    expect("receipt" in r && r.receipt.item.removedAt).toBeTruthy();

    const fresh = await addItem(db, ownerId, { ...want, title: "Puzzle" });
    await deleteItem(db, ownerId, fresh.id);
    expect(await claimItem(db, fresh.id, { name: "Rose", email: null }, "hash-rose", null)).toEqual({ error: "not_found" });
  });

  it("edits details but never turns a claimable item into a group gift", async () => {
    const item = await addItem(db, ownerId, { ...want, title: "Sweter", priceCents: 4000 });
    const edit = { title: "Sweater", url: null, imageUrl: null, priceCents: 4500, notes: "Size M", groupTargetCents: 9000 };
    expect(await updateItem(db, ownerId, item.id, edit)).toBe(true);
    const saved = (await ownItems(db, ownerId)).want.find((i) => i.id === item.id)!;
    expect(saved).toMatchObject({ title: "Sweater", priceCents: 4500, notes: "Size M", groupTargetCents: null });

    const group = await addItem(db, ownerId, { ...want, title: "Camera", groupTargetCents: 50000 });
    await updateItem(db, ownerId, group.id, { ...edit, title: "Camera", groupTargetCents: 60000 });
    expect((await ownItems(db, ownerId)).want.find((i) => i.id === group.id)!.groupTargetCents).toBe(60000);

    const stranger = await signUp(db, { name: "X", email: "x@example.com", handle: "xxx", password: "password1" });
    if ("error" in stranger) throw new Error(stranger.error);
    expect(await updateItem(db, stranger.user.id, item.id, edit)).toBe(false);
  });
});

describe("account recovery and deletion", () => {
  it("resets a password once, and signs out every old session", async () => {
    const old = await logIn(db, "maya@example.com", "maya-password");
    expect(await requestPasswordReset(db, "nobody@example.com")).toBeNull();
    const reset = await requestPasswordReset(db, "MAYA@example.com");

    const done = await resetPassword(db, reset!.token, "new-password-1");
    expect(done?.user.id).toBe(ownerId);
    expect(await userForSession(db, old!.session.token)).toBeNull();
    expect(await logIn(db, "maya@example.com", "new-password-1")).not.toBeNull();
    expect(await resetPassword(db, reset!.token, "another-one-2")).toBeNull();
  });

  it("deletes an account only with the right password", async () => {
    const res = await signUp(db, { name: "Temp", email: "temp@example.com", handle: "temp", password: "temp-password" });
    if ("error" in res) throw new Error(res.error);
    expect(await deleteAccount(db, res.user.id, "wrong")).toBe(false);
    expect(await deleteAccount(db, res.user.id, "temp-password")).toBe(true);
    expect(await publicList(db, "temp", anon)).toBeNull();
  });
});

describe("rate limits", () => {
  it("allows up to the limit inside a window, then refuses", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await allow(db, "test:key", 3, 60));
    expect(results).toEqual([true, true, true, false]);
    expect(await allow(db, "test:other", 3, 60)).toBe(true);
  });
});
