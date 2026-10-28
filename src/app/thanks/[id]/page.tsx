import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Confetti } from "@/components/receipt/Confetti";
import { GiftRing } from "@/components/receipt/GiftRing";
import { CountUp, ReceiptActions } from "@/components/receipt/ReceiptControls";
import { getDb } from "@/lib/db";
import { receipt, type Receipt } from "@/lib/gifts";
import { formatCents, shareWords } from "@/lib/money";
import { greetName } from "@/lib/names";
import { currentUser } from "@/lib/session";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> };

// Generic on purpose: if this link lands in the recipient's messages, the preview mustn't give the gift away.
export const metadata: Metadata = {
  title: "Gift receipt",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { title: "A gift receipt", description: "Someone's being very generous." },
};

const at = (s: number) => ({ "--at": `${s}s` }) as CSSProperties;
const host = (url: string) => new URL(url).hostname.replace(/^www\./, "");
const receiptNo = (id: string) => id.replace(/-/g, "").slice(0, 8).toUpperCase().replace(/(.{4})/, "$1-");
const longDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

function Headline({ r, first }: { r: Receipt; first: string }) {
  const whole = r.kind === "claim" || r.yourCents >= r.targetCents;
  const size = r.item.title.length > 70 ? "text-2xl" : r.item.title.length > 36 ? "text-3xl" : "text-4xl sm:text-5xl";
  return (
    <h1 className="mt-6 text-center">
      <span className="rn-fade block text-lg text-muted" style={at(0.6)}>Your gift to {first}</span>
      {whole ? (
        <span className={`rn-fade rn-shine mt-1 line-clamp-3 block font-display font-semibold leading-[1.12] ${size}`} style={at(0.8)}>
          {r.item.title}
        </span>
      ) : (
        <>
          <span className="rn-fade rn-shine block font-display text-6xl font-semibold leading-none tracking-tight sm:text-7xl" style={at(0.8)}>
            {shareWords(r.yourCents, r.targetCents)}
          </span>
          <span className="rn-fade mt-2 line-clamp-2 block font-display text-xl text-ink sm:text-2xl" style={at(1)}>
            of the {r.item.title}
          </span>
        </>
      )}
    </h1>
  );
}

function Together({ r, first }: { r: Receipt; first: string }) {
  if (r.kind === "claim") {
    return <>It&apos;s marked as taken, so nobody else will buy it. {first} can&apos;t see who.</>;
  }
  const total = r.yourCents + r.othersCents;
  const left = r.targetCents - total;
  const others = `${r.otherGifters} ${r.otherGifters === 1 ? "other" : "others"}`;
  if (left <= 0) return r.otherGifters ? <>Fully funded! You and {others} made it happen. 🎉</> : <>Fully funded, all by you. 🎉</>;
  if (!r.otherGifters) return <>You&apos;re the first to chip in. {formatCents(left)} to go.</>;
  return <>You and {others} have pledged {formatCents(total)}. Just {formatCents(left)} to go.</>;
}

function NextSteps({ r, first }: { r: Receipt; first: string }) {
  const steps =
    r.kind === "claim"
      ? [
          r.item.url ? <>Buy it whenever you&apos;re ready. <a href={r.item.url} target="_blank" rel="noopener noreferrer" className="text-pine underline underline-offset-4">Open it at {host(r.item.url)} ↗</a></> : <>Buy it whenever you&apos;re ready.</>,
          <>Wrap it, hide it, and wait for the big moment.</>,
          <>Keep this receipt. It&apos;s how you change your mind later.</>,
        ]
      : [
          <>A pledge is a promise, not a payment. Nothing has been charged.</>,
          <>Once the goal is reached, settle up with whoever buys the gift.</>,
          <>Keep this receipt. It&apos;s how you change your pledge later.</>,
        ];
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3 text-[17px] leading-snug">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-pine-soft text-sm font-semibold text-pine">{i + 1}</span>
          <span className="pt-0.5">{s}</span>
        </li>
      ))}
      <li className="flex gap-3 text-[17px] leading-snug">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 text-sm">🤫</span>
        <span className="pt-0.5">{first} can&apos;t see any of this. The surprise is safe.</span>
      </li>
    </ol>
  );
}

export default async function ReceiptPage({ params, searchParams }: Props) {
  const [{ id }, { new: fresh }] = await Promise.all([params, searchParams]);
  const viewer = await currentUser();
  const found = await receipt(await getDb(), id, viewer?.id ?? null);

  if ("error" in found && found.error === "owner") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <p className="text-6xl">🙈</p>
        <h1 className="mt-4 font-display text-3xl font-semibold">No peeking!</h1>
        <p className="mt-2 text-lg text-muted">This is a gift receipt for something on your list. It belongs to the gifter.</p>
        <Link href="/me" className="btn-primary mt-6">Back to my list</Link>
      </div>
    );
  }
  if (!("receipt" in found)) notFound();

  const r = found.receipt;
  const first = r.owner.name.split(" ")[0];
  const h = await headers();
  const origin = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const justMade = fresh === "1";
  const isClaim = r.kind === "claim";
  const target = r.targetCents || 1;

  return (
    <div className="relative pt-4 pb-10">
      {justMade && !r.item.removedAt ? <Confetti /> : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-[520px] max-w-2xl rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--color-gold) 28%, transparent), transparent)" }}
      />

      <div className="mx-auto max-w-[30rem]">
        <p className="rn-fade mb-5 text-center font-display text-2xl sm:text-3xl" style={at(0.1)}>
          Thank you, {greetName(r.gifterName)}.
        </p>

        {r.item.removedAt ? (
          <div role="status" className="mb-5 rounded-2xl bg-gold/15 px-4 py-3 text-[17px]">
            {first} has since taken this off the list. You might check with {first} before buying.
          </div>
        ) : null}

        <div className="rn-rise drop-shadow-[0_28px_40px_rgba(60,40,20,0.18)]" style={at(0.15)}>
          <article className="rn-ticket rounded-t-[28px] bg-card px-7 pt-6">
            <header className="flex items-center justify-between text-xs tracking-[0.18em] text-muted uppercase">
              <span className="font-display text-sm tracking-normal normal-case">Regret<span className="text-berry">Nothing</span></span>
              <span>Gift receipt</span>
            </header>

            <div className="mt-6">
              <div className="relative">
                <GiftRing
                  imageUrl={r.item.imageUrl}
                  initial={r.item.title.slice(0, 1).toUpperCase()}
                  others={isClaim ? 0 : r.othersCents / target}
                  yours={isClaim ? 1 : r.yourCents / target}
                />
                {isClaim ? (
                  <span
                    className="rn-stamp absolute -right-1 top-3 rounded-lg border-[3px] border-double border-berry bg-card/95 px-3 py-1 font-display text-xl font-bold tracking-widest text-berry uppercase sm:right-4"
                    style={at(2.2)}
                  >
                    Claimed
                  </span>
                ) : null}
              </div>
            </div>

            <Headline r={r} first={first} />

            {isClaim ? null : (
              <p className="rn-fade mt-4 text-center" style={at(1.2)}>
                <span className="font-display text-4xl font-semibold"><CountUp cents={r.yourCents} delay={1.2} /></span>
                <span className="ml-2 text-lg text-muted">of {formatCents(r.targetCents)}</span>
              </p>
            )}
            <p className="rn-fade mx-auto mt-3 max-w-sm text-center text-[17px] text-muted" style={at(1.4)}>
              <Together r={r} first={first} />
            </p>

            <div className="rn-perf mt-7 mb-5" />

            <dl className="rn-fade grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[16px]" style={at(1.6)}>
              <dt className="text-muted">From</dt>
              <dd className="text-right font-medium">{r.gifterName}</dd>
              <dt className="text-muted">For</dt>
              <dd className="text-right font-medium">{r.owner.name}</dd>
              <dt className="text-muted">{isClaim ? "Gift" : "Your part"}</dt>
              <dd className="text-right font-medium">
                {isClaim ? (r.item.priceCents ? formatCents(r.item.priceCents) : "The whole thing") : `${formatCents(r.yourCents)} of ${formatCents(r.targetCents)}`}
              </dd>
              <dt className="text-muted">Date</dt>
              <dd className="text-right font-medium">{longDate(r.createdAt)}</dd>
              <dt className="text-muted">Receipt</dt>
              <dd className="text-right font-mono text-[15px] tracking-wider">No. {receiptNo(r.id)}</dd>
            </dl>

            <div className="rn-perf mt-5 mb-5" />

            <section className="rn-fade" style={at(1.8)}>
              <h2 className="mb-3 text-xs tracking-[0.18em] text-muted uppercase">What happens next</h2>
              <NextSteps r={r} first={first} />
            </section>
          </article>
        </div>

        <ReceiptActions
          id={r.id}
          firstName={first}
          listUrl={`${origin}/u/${r.owner.handle}`}
          email={r.gifterEmail}
          mailOn={!!process.env.SMTP_URL}
          justMade={justMade}
          isClaim={isClaim}
        />
      </div>
    </div>
  );
}
