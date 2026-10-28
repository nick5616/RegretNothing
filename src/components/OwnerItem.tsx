"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteItemAction, updateItemAction } from "@/app/actions";
import type { Item } from "@/lib/db/schema";
import { ItemCard } from "./ItemCard";

const dollars = (cents: number | null) => (cents ? (cents / 100).toFixed(2).replace(/\.00$/, "") : "");

function EditForm({ item, onDone }: { item: Item; onDone: () => void }) {
  const [state, action, pending] = useActionState(updateItemAction, undefined);
  const f = state?.fields;
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-2.5 rounded-2xl border border-pine/40 bg-card p-4">
      <input type="hidden" name="itemId" value={item.id} />
      {state?.error ? <p role="alert" className="rounded-xl bg-berry-soft px-3.5 py-2.5 text-sm text-berry">{state.error}</p> : null}
      <input name="title" required defaultValue={f?.title ?? item.title} aria-label="Name" className="field font-medium" autoFocus />
      <div className="grid grid-cols-[8rem_1fr] gap-2">
        <input name="price" inputMode="decimal" defaultValue={f?.price ?? dollars(item.priceCents)} placeholder="Price" aria-label="Price" className="field" />
        <input name="url" inputMode="url" defaultValue={f?.url ?? item.url ?? ""} placeholder="Store link" aria-label="Store link" className="field" />
      </div>
      <input name="imageUrl" inputMode="url" defaultValue={f?.imageUrl ?? item.imageUrl ?? ""} placeholder="Photo link" aria-label="Photo link" className="field" />
      <input name="notes" defaultValue={f?.notes ?? item.notes ?? ""} placeholder="Notes" aria-label="Notes" className="field" />
      {item.groupTargetCents ? (
        <label className="flex items-center gap-2 text-[15px] text-muted">
          Group goal $
          <input name="groupTarget" inputMode="decimal" defaultValue={f?.groupTarget ?? dollars(item.groupTargetCents)} aria-label="Group goal" className="field max-w-32" />
        </label>
      ) : null}
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary flex-1">{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onDone} className="btn-quiet">Cancel</button>
      </div>
    </form>
  );
}

/** An item on the owner's dashboard: edit in place, remove with a second tap. */
export function OwnerItem({ item }: { item: Item }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  if (editing) return <EditForm item={item} onDone={() => setEditing(false)} />;

  return (
    <ItemCard item={item}>
      <div className="mt-2 flex items-center gap-4 text-sm">
        <button onClick={() => setEditing(true)} className="text-muted underline decoration-line hover:text-ink">Edit</button>
        {confirming ? (
          <form action={deleteItemAction} className="flex items-center gap-3">
            <input type="hidden" name="itemId" value={item.id} />
            <button className="font-medium text-berry underline">Yes, remove it</button>
            <button type="button" onClick={() => setConfirming(false)} className="text-muted">Keep</button>
          </form>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-muted underline decoration-line hover:text-berry">Remove</button>
        )}
      </div>
    </ItemCard>
  );
}
