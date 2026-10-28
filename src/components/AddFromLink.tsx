"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AddItemForm, type AddStart } from "./AddItemForm";

export function AddFromLink({ start }: { start?: AddStart }) {
  const [kind, setKind] = useState<"want" | "have">("want");
  const [done, setDone] = useState(false);
  const onAdded = useCallback(() => setDone(true), []);

  if (done) {
    return (
      <div className="space-y-4 rounded-2xl border border-line bg-card p-6 text-center">
        <p className="text-4xl">✓</p>
        <p className="text-lg">Added to {kind === "want" ? "what you'd love" : "what you already have"}.</p>
        <div className="flex justify-center gap-2">
          <Link href="/me" className="btn-primary">See my list</Link>
          {/* The store button opens this in a new tab, so closing it drops you back on the store. */}
          <button onClick={() => (window.opener ? window.close() : history.back())} className="btn-quiet">Back to the store</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Which list" className="grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1 text-[15px]">
        {(["want", "have"] as const).map((k) => (
          <button
            key={k}
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-lg py-2 font-medium transition ${kind === k ? "bg-card shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {k === "want" ? "I'd love this" : "I already have this"}
          </button>
        ))}
      </div>
      <AddItemForm key={kind} kind={kind} start={start} onAdded={onAdded} />
    </div>
  );
}
