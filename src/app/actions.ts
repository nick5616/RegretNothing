"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  addItem,
  cancelByReceipt,
  claimItem,
  deleteAccount,
  deleteItem,
  gifterSchema,
  itemEditSchema,
  itemSchema,
  logIn,
  pledgeToItem,
  receipt,
  requestPasswordReset,
  resetPassword,
  signUp,
  signUpSchema,
  unclaimItem,
  updateItem,
  withdrawPledges,
  type Receipt,
} from "@/lib/gifts";
import { sendMail } from "@/lib/mail";
import { formatCents, parseDollars } from "@/lib/money";
import { greetName } from "@/lib/names";
import { allow } from "@/lib/rateLimit";
import { currentUser, endSession, ensureGifterHash, requireUser, setSessionCookie } from "@/lib/session";
import { unfurl } from "@/lib/unfurl";

export type FormState = { error?: string; fields?: Record<string, string>; ok?: boolean } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const fields = (fd: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, str(fd, k)]));
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Something's off with that form";
const SLOW_DOWN = "That's a lot of tries. Wait a few minutes, then try again.";

async function clientIp() {
  const h = await headers();
  return h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}

async function origin() {
  if (process.env.APP_URL) return process.env.APP_URL;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}

// ---------- accounts ----------

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const keep = fields(fd, ["name", "email", "handle"]);
  const parsed = signUpSchema.safeParse({ ...keep, password: String(fd.get("password") ?? "") });
  if (!parsed.success) return { error: firstIssue(parsed.error), fields: keep };

  const db = await getDb();
  if (!(await allow(db, `signup:ip:${await clientIp()}`, 10, 3600))) return { error: SLOW_DOWN, fields: keep };
  const result = await signUp(db, parsed.data);
  if ("error" in result) {
    const error = result.error === "email_taken" ? "That email already has a list. Log in instead?" : "That link is taken. Try another.";
    return { error, fields: keep };
  }
  await setSessionCookie(result.session);
  redirect("/me");
}

export async function logInAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email");
  const db = await getDb();
  const okIp = await allow(db, `login:ip:${await clientIp()}`, 30, 900);
  const okEmail = await allow(db, `login:email:${email.toLowerCase()}`, 10, 900);
  if (!okIp || !okEmail) return { error: SLOW_DOWN, fields: { email } };

  const result = await logIn(db, email, String(fd.get("password") ?? ""));
  if (!result) return { error: "That email and password don't match.", fields: { email } };
  await setSessionCookie(result.session);
  redirect("/me");
}

export async function logOutAction() {
  await endSession();
  redirect("/");
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "That email doesn't look right", fields: { email } };

  const db = await getDb();
  const okIp = await allow(db, `forgot:ip:${await clientIp()}`, 10, 3600);
  const okEmail = await allow(db, `forgot:email:${email}`, 3, 3600);
  if (!okIp || !okEmail) return { error: SLOW_DOWN, fields: { email } };

  const reset = await requestPasswordReset(db, email);
  if (reset) {
    const link = `${await origin()}/reset/${reset.token}`;
    await sendMail({
      to: reset.user.email,
      subject: "Reset your RegretNothing password",
      text: `Hi ${reset.user.name.split(" ")[0]},\n\nSet a new password here (the link works for an hour):\n${link}\n\nIf you didn't ask for this, ignore this email. Your password hasn't changed.`,
    });
  }
  // Same answer either way, so this form can't be used to find out who has an account.
  return { ok: true, fields: { email } };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  const check = signUpSchema.shape.password.safeParse(password);
  if (!check.success) return { error: firstIssue(check.error) };
  const result = await resetPassword(await getDb(), str(fd, "token"), password);
  if (!result) return { error: "This reset link has expired or was already used. Ask for a new one." };
  await setSessionCookie(result.session);
  redirect("/me");
}

export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await getDb();
  if (!(await allow(db, `delete:user:${user.id}`, 5, 900))) return { error: SLOW_DOWN };
  if (!(await deleteAccount(db, user.id, String(fd.get("password") ?? "")))) return { error: "That password isn't right." };
  await endSession();
  redirect("/?deleted=1");
}

// ---------- the owner's list ----------

const normalizeUrl = (raw: string) => (raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw) || null;

export type LinkPreview = { title: string | null; imageUrl: string | null; price: string | null; site: string };

/** Reads a pasted link so the add form can show its details before saving. */
export async function previewLinkAction(raw: string): Promise<LinkPreview | null> {
  const user = await requireUser();
  const url = normalizeUrl(raw.trim());
  let site: string;
  try {
    site = new URL(url!).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  // Each preview makes the server fetch a page, so cap how often one account can ask.
  if (!(await allow(await getDb(), `preview:user:${user.id}`, 60, 600))) return { title: null, imageUrl: null, price: null, site };
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

export async function updateItemAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const keep = fields(fd, ["itemId", "url", "title", "price", "imageUrl", "notes", "groupTarget"]);
  const parsed = itemEditSchema.safeParse({
    title: keep.title,
    url: normalizeUrl(keep.url),
    imageUrl: normalizeUrl(keep.imageUrl),
    priceCents: parseDollars(keep.price),
    notes: keep.notes || null,
    groupTargetCents: parseDollars(keep.groupTarget),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error), fields: keep };
  if (!(await updateItem(await getDb(), user.id, keep.itemId, parsed.data))) return { error: "That item is gone.", fields: keep };
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

/** Emails a gifter their receipt link after the response is sent, so a slow mail server never holds up the page. */
function emailReceiptLater(id: string, to: string | null) {
  if (!to) return;
  after(async () => {
    const found = await receipt(await getDb(), id, null);
    if ("receipt" in found) await sendMail(receiptEmail(found.receipt, `${await origin()}/thanks/${id}`, to));
  });
}

function receiptEmail(r: Receipt, link: string, to: string) {
  const first = r.owner.name.split(" ")[0];
  const what =
    r.kind === "claim"
      ? `You're giving ${first} ${r.item.title}.`
      : `You're chipping in ${formatCents(r.yourCents)} toward ${first}'s ${r.item.title}.`;
  return {
    to,
    subject: r.kind === "claim" ? `Your gift for ${first}` : `You're chipping in on ${first}'s gift`,
    text: `Thank you, ${greetName(r.gifterName)}!\n\n${what}\n\nYour receipt:\n${link}\n\nKeep this email. The link shows your gift and lets you change it from any phone or computer. ${first} can't see it, so the surprise is safe.`,
  };
}

export async function claimAction(_: FormState, fd: FormData): Promise<FormState> {
  const keep = fields(fd, ["name", "email"]);
  const parsed = gifterSchema.safeParse(keep);
  if (!parsed.success) return { error: firstIssue(parsed.error), fields: keep };

  const db = await getDb();
  if (!(await allow(db, `gift:ip:${await clientIp()}`, 30, 600))) return { error: SLOW_DOWN, fields: keep };
  const viewer = await currentUser();
  const result = await claimItem(db, str(fd, "itemId"), parsed.data, await ensureGifterHash(), viewer?.id ?? null);
  if ("error" in result) return { error: ERRORS[result.error], fields: keep };
  revalidatePath(`/u/${str(fd, "handle")}`);
  emailReceiptLater(result.receiptId, parsed.data.email);
  redirect(`/thanks/${result.receiptId}?new=1`);
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

  const db = await getDb();
  if (!(await allow(db, `gift:ip:${await clientIp()}`, 30, 600))) return { error: SLOW_DOWN, fields: keep };
  const viewer = await currentUser();
  const result = await pledgeToItem(db, str(fd, "itemId"), { ...parsed.data, amountCents }, await ensureGifterHash(), viewer?.id ?? null);
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
  emailReceiptLater(result.receiptId, parsed.data.email);
  redirect(`/thanks/${result.receiptId}?new=1`);
}

export async function withdrawAction(fd: FormData) {
  await withdrawPledges(await getDb(), str(fd, "itemId"), await ensureGifterHash());
  revalidatePath(`/u/${str(fd, "handle")}`);
}

// ---------- receipts ----------

export async function emailReceiptAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const email = str(fd, "email").toLowerCase();
  if (!z.email().safeParse(email).success) return { error: "That email doesn't look right", fields: { email } };
  const db = await getDb();
  if (!(await allow(db, `receipt-mail:ip:${await clientIp()}`, 10, 3600))) return { error: SLOW_DOWN, fields: { email } };
  const found = await receipt(db, id, null);
  if (!("receipt" in found)) return { error: "We couldn't find that receipt." };
  const sent = await sendMail(receiptEmail(found.receipt, `${await origin()}/thanks/${id}`, email));
  return sent ? { ok: true, fields: { email } } : { error: "Email isn't working right now. Bookmark this page instead.", fields: { email } };
}

export async function cancelGiftAction(fd: FormData) {
  const cancelled = await cancelByReceipt(await getDb(), str(fd, "id"));
  if (!cancelled) redirect("/");
  revalidatePath(`/u/${cancelled.handle}`);
  redirect(`/u/${cancelled.handle}`);
}
