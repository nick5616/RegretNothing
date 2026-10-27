import { beforeAll, describe, expect, it } from "vitest";
import { getDb, type Db } from "@/lib/db";
import { userForSession } from "@/lib/auth";
import { addItem, claimItem, logIn, ownItems, pledgeToItem, publicList, signUp, unclaimItem, withdrawPledges } from "@/lib/gifts";

let db: Db;
let ownerId: string;
const anon = { userId: null, gifterHash: null };
const want = { kind: "want" as const, url: null, imageUrl: null, priceCents: null, notes: null, groupTargetCents: null };

beforeAll(async () => {
  db = await getDb();
  const res = await signUp(db, { name: "Nick B", email: "nick@example.com", handle: "nick", password: "hunter22!" });
  if ("error" in res) throw new Error(res.error);
  ownerId = res.user.id;
});

describe("accounts", () => {
  it("rejects a duplicate email or handle", async () => {
    expect(await signUp(db, { name: "X", email: "nick@example.com", handle: "other", password: "password1" })).toEqual({ error: "email_taken" });
    expect(await signUp(db, { name: "X", email: "x@example.com", handle: "nick", password: "password1" })).toEqual({ error: "handle_taken" });
  });

  it("logs in with the right password and issues a working session", async () => {
    expect(await logIn(db, "nick@example.com", "wrong-password")).toBeNull();
    const ok = await logIn(db, "NICK@example.com ", "hunter22!");
    expect(ok?.user.id).toBe(ownerId);
    expect((await userForSession(db, ok!.session.token))?.handle).toBe("nick");
    expect(await userForSession(db, "forged-token")).toBeNull();
  });
});

describe("claims", () => {
  it("lets exactly one gifter claim an item, and only they can undo it", async () => {
    const item = await addItem(db, ownerId, { ...want, title: "Cast iron pan" });
    const alex = { name: "Alex", email: null };

    expect(await claimItem(db, item.id, alex, "hash-alex", null)).toEqual({ ok: true });
    expect(await claimItem(db, item.id, { name: "Sam", email: null }, "hash-sam", null)).toEqual({ error: "taken" });
    expect(await unclaimItem(db, item.id, "hash-sam")).toBe(false);

    const asAlex = await publicList(db, "nick", { userId: null, gifterHash: "hash-alex" });
    expect(asAlex!.wants.find((w) => w.id === item.id)!.claim).toEqual({ name: "Alex", mine: true });
    const asSam = await publicList(db, "nick", { userId: null, gifterHash: "hash-sam" });
    expect(asSam!.wants.find((w) => w.id === item.id)!.claim).toEqual({ name: "Alex", mine: false });

    expect(await unclaimItem(db, item.id, "hash-alex")).toBe(true);
    expect(await claimItem(db, item.id, { name: "Sam", email: null }, "hash-sam", null)).toEqual({ ok: true });
  });

  it("resolves simultaneous claims to a single winner", async () => {
    const item = await addItem(db, ownerId, { ...want, title: "Headphones" });
    const results = await Promise.all(
      ["a", "b", "c", "d"].map((g) => claimItem(db, item.id, { name: g, email: null }, `hash-${g}`, null)),
    );
    expect(results.filter((r) => "ok" in r)).toHaveLength(1);
  });

  it("refuses claims on your own list and on 'have' items", async () => {
    const mine = await addItem(db, ownerId, { ...want, title: "Socks" });
    const have = await addItem(db, ownerId, { ...want, kind: "have", title: "Air fryer" });
    expect(await claimItem(db, mine.id, { name: "Me", email: null }, "h", ownerId)).toEqual({ error: "own_item" });
    expect(await claimItem(db, have.id, { name: "A", email: null }, "h", null)).toEqual({ error: "not_found" });
  });
});

describe("surprise protection", () => {
  it("never shows the owner who claimed or pledged", async () => {
    const claimed = await addItem(db, ownerId, { ...want, title: "Kindle" });
    await claimItem(db, claimed.id, { name: "Grandma", email: null }, "hash-grandma", null);
    const group = await addItem(db, ownerId, { ...want, title: "Bike", groupTargetCents: 50000 });
    await pledgeToItem(db, group.id, { name: "Uncle", email: null, amountCents: 10000 }, "hash-uncle", null);

    const asOwner = await publicList(db, "nick", { userId: ownerId, gifterHash: "hash-grandma" });
    expect(asOwner!.isOwner).toBe(true);
    for (const w of asOwner!.wants) {
      expect(w.claim).toBeNull();
      expect(w.pledgedCents).toBe(0);
      expect(w.myPledgeCents).toBe(0);
    }
    // The owner's dashboard query carries no claim fields at all.
    const own = await ownItems(db, ownerId);
    expect(Object.keys(own.want[0])).not.toContain("claim");
  });

  it("shows 'have' items to everyone", async () => {
    const list = await publicList(db, "nick", anon);
    expect(list!.haves.map((h) => h.title)).toContain("Air fryer");
  });
});

describe("group gifts", () => {
  it("caps pledges at the goal and allows withdrawing", async () => {
    const item = await addItem(db, ownerId, { ...want, title: "Stand mixer", groupTargetCents: 30000 });
    expect(await pledgeToItem(db, item.id, { name: "A", email: null, amountCents: 20000 }, "ga", null)).toEqual({ ok: true, remainingCents: 10000 });
    expect(await pledgeToItem(db, item.id, { name: "B", email: null, amountCents: 15000 }, "gb", null)).toEqual({ error: "over_target", remainingCents: 10000 });
    expect(await claimItem(db, item.id, { name: "C", email: null }, "gc", null)).toEqual({ error: "not_claimable" });

    await withdrawPledges(db, item.id, "ga");
    const list = await publicList(db, "nick", anon);
    expect(list!.wants.find((w) => w.id === item.id)!.pledgedCents).toBe(0);
  });
});
