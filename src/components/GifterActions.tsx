"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { claimAction, pledgeAction, unclaimAction, withdrawAction } from "@/app/actions";
import type { GifterWant } from "@/lib/gifts";
import { formatCents } from "@/lib/money";

// Remember the gifter's name between claims on this device. Purely a convenience.
const NAME_KEY = "rn_gifter_name";
function useRememberedName() {
  const [name, setName] = useState("");
  // Read when a form opens, not on mount, so a name saved by an earlier claim on this page is picked up.
  const recall = () => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
  };
  const remember = (n: string) => {
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {}
  };
  return [name, remember, recall] as const;
}

function Hidden({ item, handle }: { item: GifterWant; handle: string }) {
  return (
    <>
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="handle" value={handle} />
    </>
  );
}

function ErrorNote({ error }: { error?: string }) {
  return error ? <p role="alert" className="text-sm text-berry">{error}</p> : null;
}

function ClaimControl({ item, handle }: { item: GifterWant; handle: string }) {
  const [state, action, pending] = useActionState(claimAction, undefined);
  const [open, setOpen] = useState(false);
  const [name, remember, recall] = useRememberedName();

  if (item.claim?.mine) {
    return (
      <form action={unclaimAction} className="mt-3 flex items-center gap-3 text-sm">
        <Hidden item={item} handle={handle} />
        <span className="rounded-full bg-pine-soft px-2.5 py-1 font-medium text-pine">You're getting this ✓</span>
        {item.claim.receiptId ? <Link href={`/thanks/${item.claim.receiptId}`} className="text-pine underline">Receipt</Link> : null}
        <button className="text-muted underline hover:text-ink">Undo</button>
      </form>
    );
  }
  if (item.claim) {
    return <p className="mt-3 text-sm text-muted">Claimed by {item.claim.name}</p>;
  }
  if (!open) {
    return (
      <button
        onClick={() => {
          recall();
          setOpen(true);
        }}
        className="btn-primary mt-3 !py-2 text-sm"
      >
        I'll get this
      </button>
    );
  }
  return (
    <form action={action} onSubmit={(e) => remember(String(new FormData(e.currentTarget).get("name") ?? ""))} className="mt-3 space-y-2">
      <Hidden item={item} handle={handle} />
      <ErrorNote error={state?.error} />
      <div className="flex flex-wrap gap-2">
        <input name="name" required placeholder="Your name" defaultValue={state?.fields?.name ?? name} key={name} className="field max-w-48 !py-2" />
        <input name="email" type="email" placeholder="Email (optional, for your receipt)" defaultValue={state?.fields?.email} className="field max-w-64 !py-2" />
        <button disabled={pending} className="btn-primary !py-2 text-sm">{pending ? "Saving…" : "Claim it"}</button>
      </div>
      <p className="text-xs text-muted">Other gifters will see it's taken. {"The list's owner won't."}</p>
    </form>
  );
}

function PledgeControl({ item, handle }: { item: GifterWant; handle: string }) {
  const [state, action, pending] = useActionState(pledgeAction, undefined);
  const [open, setOpen] = useState(false);
  const [name, remember, recall] = useRememberedName();
  const target = item.groupTargetCents!;
  const pct = Math.min(100, Math.round((item.pledgedCents / target) * 100));
  const funded = item.pledgedCents >= target;

  return (
    <div className="mt-3 space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-pine transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-muted">
        {formatCents(item.pledgedCents)} of {formatCents(target)} pledged
        {item.pledgeCount ? ` by ${item.pledgeCount} ${item.pledgeCount === 1 ? "person" : "people"}` : ""}
        {funded ? " · fully funded 🎉" : ""}
      </p>
      {item.myPledgeCents ? (
        <form action={withdrawAction} className="flex items-center gap-3 text-sm">
          <Hidden item={item} handle={handle} />
          <span className="rounded-full bg-pine-soft px-2.5 py-1 font-medium text-pine">You pledged {formatCents(item.myPledgeCents)}</span>
          {item.myReceiptId ? <Link href={`/thanks/${item.myReceiptId}`} className="text-pine underline">Receipt</Link> : null}
          <button className="text-muted underline hover:text-ink">Withdraw</button>
        </form>
      ) : null}
      {funded ? null : open ? (
        <form action={action} onSubmit={(e) => remember(String(new FormData(e.currentTarget).get("name") ?? ""))} className="space-y-2">
          <Hidden item={item} handle={handle} />
          <ErrorNote error={state?.error} />
          <div className="flex flex-wrap gap-2">
            <input name="amount" inputMode="decimal" required placeholder="$ amount" defaultValue={state?.fields?.amount} className="field max-w-28 !py-2" />
            <input name="name" required placeholder="Your name" defaultValue={state?.fields?.name ?? name} key={name} className="field max-w-48 !py-2" />
            <input name="email" type="email" placeholder="Email (optional, for your receipt)" defaultValue={state?.fields?.email} className="field max-w-56 !py-2" />
            <button disabled={pending} className="btn-primary !py-2 text-sm">{pending ? "Saving…" : "Pledge"}</button>
          </div>
          <p className="text-xs text-muted">A pledge is a promise, not a payment. Settle up with whoever buys it.</p>
        </form>
      ) : (
        <button
          onClick={() => {
            recall();
            setOpen(true);
          }}
          className="btn-primary !py-2 text-sm"
        >
          Chip in
        </button>
      )}
    </div>
  );
}

export function GifterActions({ item, handle }: { item: GifterWant; handle: string }) {
  return item.groupTargetCents ? <PledgeControl item={item} handle={handle} /> : <ClaimControl item={item} handle={handle} />;
}
