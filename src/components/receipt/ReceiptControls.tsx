"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { cancelGiftAction, emailReceiptAction } from "@/app/actions";
import { formatCents } from "@/lib/money";

/** Counts up to `cents` once the amount fades in. Renders the final number first, so print and no-JS are right. */
export function CountUp({ cents, delay = 1.1, duration = 1.5 }: { cents: number; delay?: number; duration?: number }) {
  const [shown, setShown] = useState(cents);
  const frame = useRef(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown(0);
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / (duration * 1000)));
      const eased = 1 - Math.pow(1 - t, 3);
      // Whole dollars while counting, exact cents at the end.
      setShown(t < 1 ? Math.round((cents * eased) / 100) * 100 : cents);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [cents, delay, duration]);
  return <span className="tabular-nums">{formatCents(shown)}</span>;
}

type ActionsProps = {
  id: string;
  firstName: string;
  listUrl: string;
  email: string | null;
  mailOn: boolean;
  justMade: boolean;
  isClaim: boolean;
};

export function ReceiptActions({ id, firstName, listUrl, email, mailOn, justMade, isClaim }: ActionsProps) {
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(emailReceiptAction, undefined);

  // Confetti is for the moment of giving; a refresh or a bookmark shouldn't replay it.
  useEffect(() => {
    if (justMade) history.replaceState(null, "", location.pathname);
  }, [justMade]);

  const share = async () => {
    const url = location.href.split("?")[0];
    const text = isClaim ? `I'm getting ${firstName}'s gift! Here's my receipt.` : `I chipped in on ${firstName}'s gift! Here's my receipt.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My gift receipt", text, url });
        return;
      } catch {
        // Dismissed or unsupported: copy instead.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mt-8 space-y-6 print:hidden">
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={() => print()} className="btn-primary py-3.5 text-base">Print or save as PDF</button>
        <button onClick={share} className="btn-quiet py-3.5 text-base">{copied ? "Link copied!" : "Send to family"}</button>
      </div>
      <p className="-mt-3 text-center text-sm text-muted">Send it to anyone but {firstName}. It would spoil the surprise.</p>

      <div className="rounded-2xl border border-line bg-card p-5">
        {mailOn ? (
          state?.ok ? (
            <p className="text-[17px]">Sent! Look for it in {state.fields?.email}.</p>
          ) : (
            <form action={action} className="space-y-3">
              <input type="hidden" name="id" value={id} />
              <label className="block">
                <span className="mb-1.5 block text-[17px] font-medium">
                  {justMade && email ? `We emailed a copy to ${email}. Want it somewhere else too?` : "Email me a copy"}
                </span>
                <span className="mb-3 block text-[15px] text-muted">The link in it shows your gift, and lets you change it, from any phone or computer.</span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input name="email" type="email" required defaultValue={state?.fields?.email ?? email ?? ""} placeholder="you@example.com" className="field py-3 text-base" />
                  <button disabled={pending} className="btn-primary shrink-0 py-3">{pending ? "Sending…" : "Email it"}</button>
                </div>
              </label>
              {state?.error ? <p role="alert" className="text-sm text-berry">{state.error}</p> : null}
            </form>
          )
        ) : (
          <p className="text-[17px]">
            <span className="font-medium">Bookmark this page.</span>{" "}
            <span className="text-muted">It&apos;s your receipt. It shows your gift and lets you change it, from any phone or computer.</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[15px]">
        <a href={listUrl} className="text-pine underline underline-offset-4">← Back to {firstName}&apos;s list</a>
        <details className="group text-right">
          <summary className="cursor-pointer list-none text-muted underline underline-offset-4 hover:text-ink">Changed your mind?</summary>
          <form action={cancelGiftAction} className="mt-3 space-y-2 rounded-2xl border border-line bg-card p-4 text-left">
            <input type="hidden" name="id" value={id} />
            <p className="text-muted">
              {isClaim ? `We'll put it back on ${firstName}'s list for someone else to get.` : "We'll take your pledge off, and the goal will need it from someone else."}
            </p>
            <button className="btn-quiet w-full border-berry/40 text-berry">{isClaim ? "Cancel my gift" : "Withdraw my pledge"}</button>
          </form>
        </details>
      </div>
    </div>
  );
}
