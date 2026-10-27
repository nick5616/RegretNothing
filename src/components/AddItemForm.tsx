"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addItemAction } from "@/app/actions";

export function AddItemForm({ kind }: { kind: "want" | "have" }) {
  const [state, action, pending] = useActionState(addItemAction, undefined);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const want = kind === "want";

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      setGroup(false);
    }
  }, [state]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-quiet w-full border-dashed text-muted hover:text-ink">
        + {want ? "Add something you'd love" : "Add something you already have"}
      </button>
    );
  }

  return (
    <form ref={form} action={action} className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <input type="hidden" name="kind" value={kind} />
      {state?.error ? <p role="alert" className="rounded-xl bg-berry-soft px-3.5 py-2.5 text-sm text-berry">{state.error}</p> : null}
      <input
        name="url"
        inputMode="url"
        placeholder="Paste a link from any store (optional)"
        defaultValue={state?.fields?.url}
        className="field"
        autoFocus
      />
      <input
        name="title"
        placeholder={want ? "Or describe it: \"Wool socks, size L, not itchy\"" : "e.g. \"Instant Pot, 6 qt\""}
        defaultValue={state?.fields?.title}
        className="field"
      />
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <input name="price" inputMode="decimal" placeholder="Price" defaultValue={state?.fields?.price} className="field" />
        <input name="notes" placeholder={want ? "Size, color, \"any of these\"…" : "Anything gifters should know"} defaultValue={state?.fields?.notes} className="field" />
      </div>
      {want ? (
        <label className="flex items-center gap-2.5 text-[15px]">
          <input type="checkbox" name="group" checked={group} onChange={(e) => setGroup(e.target.checked)} className="h-4 w-4 accent-pine" />
          Big-ticket? Let people chip in together
        </label>
      ) : null}
      {group ? (
        <input name="groupTarget" inputMode="decimal" placeholder="Goal amount (defaults to the price)" defaultValue={state?.fields?.groupTarget} className="field" />
      ) : null}
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary flex-1">{pending ? "Fetching details…" : "Add to list"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-quiet">Done</button>
      </div>
    </form>
  );
}
