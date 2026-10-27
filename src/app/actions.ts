"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  addItem,
  claimItem,
  deleteItem,
  gifterSchema,
  itemSchema,
  logIn,
  pledgeToItem,
  signUp,
  signUpSchema,
  unclaimItem,
  withdrawPledges,
} from "@/lib/gifts";
import { formatCents, parseDollars } from "@/lib/money";
import { currentUser, endSession, ensureGifterHash, requireUser, setSessionCookie } from "@/lib/session";
import { unfurl } from "@/lib/unfurl";

export type FormState = { error?: string; fields?: Record<string, string>; ok?: boolean } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const fields = (fd: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, str(fd, k)]));
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Something's off with that form";

// ---------- accounts ----------

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const keep = fields(fd, ["name", "email", "handle"]);
  const parsed = signUpSchema.safeParse({ ...keep, password: String(fd.get("password") ?? "") });
  if (!parsed.success) return { error: firstIssue(parsed.error), fields: keep };

  const result = await signUp(await getDb(), parsed.data);
  if ("error" in result) {
    const error = result.error === "email_taken" ? "That email already has a list. Log in instead?" : "That link is taken. Try another.";
    return { error, fields: keep };
  }
  await setSessionCookie(result.session);
  redirect("/me");
}

export async function logInAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email");
  const result = await logIn(await getDb(), email, String(fd.get("password") ?? ""));
  if (!result) return { error: "That email and password don't match.", fields: { email } };
  await setSessionCookie(result.session);
  redirect("/me");
}

export async function logOutAction() {
  await endSession();
  redirect("/");
}

// ---------- the owner's list ----------

const normalizeUrl = (raw: string) => (raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw) || null;

export type LinkPreview = { title: string | null; imageUrl: string | null; price: string | null; site: string };

/** Reads a pasted link so the add form can show its details before saving. */
export async function previewLinkAction(raw: string): Promise<LinkPreview | null> {
  await requireUser();
  const url = normalizeUrl(raw.trim());
  let site: string;
  try {
    site = new URL(url!).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  const found = await unfurl(url!);
  return {
    title: found.title,
    imageUrl: found.imageUrl,
    price: found.priceCents ? (found.priceCents / 100).toFixed(2).replace(/\.00$/, "") : null,
    site,
  };
}

export async function addItemAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const keep = fields(fd, ["kind", "url", "title", "price", "imageUrl", "notes", "groupTarget"]);
  const url = normalizeUrl(keep.url);

  let title = keep.title;
  let priceCents = parseDollars(keep.price);
  let imageUrl: string | null = keep.imageUrl ? normalizeUrl(keep.imageUrl) : null;
  // The form previews links itself; this only runs when it couldn't (e.g. no JavaScript).
  if (url && fd.get("previewed") !== "1") {
    const found = await unfurl(url);
    title ||= found.title ?? "";
    priceCents ??= found.priceCents;
    imageUrl ??= found.imageUrl;
  }
  if (!title) {
    return {
      error: url ? "We couldn't read that page. Give it a name and we'll save the link." : "Give it a name.",
      fields: keep,
    };
  }

  const parsed = itemSchema.safeParse({
    kind: keep.kind,
    title,
    url,
    imageUrl,
    priceCents,
    notes: keep.notes || null,
    groupTargetCents: fd.get("group") === "on" ? parseDollars(keep.groupTarget) ?? priceCents : null,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error), fields: keep };
  if (fd.get("group") === "on" && !parsed.data.groupTargetCents) {
    return { error: "Set a dollar goal for the group gift.", fields: keep };
  }

  await addItem(await getDb(), user.id, parsed.data);
  revalidatePath("/me");
  revalidatePath(`/u/${user.handle}`);
  return { ok: true };
}

export async function deleteItemAction(fd: FormData) {
  const user = await requireUser();
  await deleteItem(await getDb(), user.id, str(fd, "itemId"));
  revalidatePath("/me");
  revalidatePath(`/u/${user.handle}`);
}

// ---------- gifters ----------

const ERRORS: Record<string, string> = {
  not_found: "That item is gone. The list may have changed.",
  own_item: "This is your own list. No peeking at who's getting what!",
  not_claimable: "This one is a group gift. Chip in instead.",
  taken: "Someone just claimed this. Pick another?",
};

export async function claimAction(_: FormState, fd: FormData): Promise<FormState> {
  const keep = fields(fd, ["name", "email"]);
  const parsed = gifterSchema.safeParse(keep);
  if (!parsed.success) return { error: firstIssue(parsed.error), fields: keep };

  const viewer = await currentUser();
  const result = await claimItem(await getDb(), str(fd, "itemId"), parsed.data, await ensureGifterHash(), viewer?.id ?? null);
  if ("error" in result) return { error: ERRORS[result.error], fields: keep };
  revalidatePath(`/u/${str(fd, "handle")}`);
  return { ok: true };
}

export async function unclaimAction(fd: FormData) {
  await unclaimItem(await getDb(), str(fd, "itemId"), await ensureGifterHash());
  revalidatePath(`/u/${str(fd, "handle")}`);
}

export async function pledgeAction(_: FormState, fd: FormData): Promise<FormState> {
  const keep = fields(fd, ["name", "email", "amount"]);
  const parsed = gifterSchema.safeParse(keep);
  if (!parsed.success) return { error: firstIssue(parsed.error), fields: keep };
  const amountCents = parseDollars(keep.amount);
  if (!amountCents) return { error: "How much would you like to chip in?", fields: keep };

  const viewer = await currentUser();
  const result = await pledgeToItem(
    await getDb(),
    str(fd, "itemId"),
    { ...parsed.data, amountCents },
    await ensureGifterHash(),
    viewer?.id ?? null,
  );
  if ("error" in result) {
    const error =
      result.error === "over_target"
        ? result.remainingCents
          ? `Only ${formatCents(result.remainingCents)} left to reach the goal.`
          : "This gift is already fully funded."
        : ERRORS[result.error];
    return { error, fields: keep };
  }
  revalidatePath(`/u/${str(fd, "handle")}`);
  return { ok: true };
}

export async function withdrawAction(fd: FormData) {
  await withdrawPledges(await getDb(), str(fd, "itemId"), await ensureGifterHash());
  revalidatePath(`/u/${str(fd, "handle")}`);
}
