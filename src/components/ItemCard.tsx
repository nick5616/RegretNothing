import type { Item } from "@/lib/db/schema";
import { formatCents } from "@/lib/money";

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Shared item presentation; owner and gifter views add their own controls via children. */
export function ItemCard({ item, muted, children }: { item: Item; muted?: boolean; children?: React.ReactNode }) {
  return (
    <article className={`flex gap-4 rounded-2xl border border-line bg-card p-4 ${muted ? "opacity-60" : ""}`}>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote store images of unknown origin
        <img src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-paper object-contain" loading="lazy" />
      ) : (
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-paper font-display text-2xl text-muted">
          {item.title.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug">{item.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {item.priceCents ? <span className="font-medium text-ink">{formatCents(item.priceCents)}</span> : null}
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate underline decoration-line underline-offset-2 hover:text-ink">
              {host(item.url)} ↗
            </a>
          ) : null}
          {item.groupTargetCents ? (
            <span className="rounded-full bg-pine-soft px-2 py-0.5 text-xs font-medium text-pine">
              Group gift · {formatCents(item.groupTargetCents)} goal
            </span>
          ) : null}
        </div>
        {item.notes ? <p className="mt-2 text-[15px] text-muted">{item.notes}</p> : null}
        {children}
      </div>
    </article>
  );
}
