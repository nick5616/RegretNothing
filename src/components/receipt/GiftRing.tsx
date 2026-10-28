import type { CSSProperties } from "react";

const SIZE = 248;
const STROKE = 18;
const R = (SIZE - STROKE) / 2 - 6;
const C = 2 * Math.PI * R;

type Props = {
  imageUrl: string | null;
  initial: string;
  /** Shares of the whole, 0..1: what everyone else has covered, then this gifter's slice on top. */
  others: number;
  yours: number;
};

/**
 * The gift as a ring around its photo. Other gifters' part is already there; this gifter's slice sweeps
 * in after it, so the moment reads as "and then you added yours".
 */
export function GiftRing({ imageUrl, initial, others, yours }: Props) {
  const o = Math.min(1, others) * C;
  const y = Math.min(1 - Math.min(1, others), yours) * C;
  const seg = (len: number, offset: number, at: number): CSSProperties =>
    ({ strokeDasharray: `${len} ${C}`, strokeDashoffset: -offset, "--c": `${C}px`, "--at": `${at}s` }) as CSSProperties;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[248px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90 overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="rn-yours" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold)" />
            <stop offset="100%" stopColor="var(--color-berry)" />
          </linearGradient>
          <filter id="rn-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-line)" strokeOpacity={0.7} strokeWidth={STROKE} />
        {o > 0 ? (
          <circle className="rn-sweep" cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-pine)" strokeOpacity={0.45} strokeWidth={STROKE} strokeLinecap="round" style={seg(o, 0, 0.5)} />
        ) : null}
        {y > 0 ? (
          <>
            <circle className="rn-sweep rn-glow" cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="url(#rn-yours)" strokeWidth={STROKE + 6} strokeLinecap="round" filter="url(#rn-blur)" opacity={0.35} style={seg(y, o, 1.1)} />
            <circle className="rn-sweep" cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="url(#rn-yours)" strokeWidth={STROKE} strokeLinecap="round" style={seg(y, o, 1.1)} />
          </>
        ) : null}
      </svg>
      <div
        className="rn-photo absolute inset-[18%] grid place-items-center overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
        style={{ "--at": "0.35s" } as CSSProperties}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote store image
          <img src={imageUrl} alt="" className="h-[78%] w-[78%] object-contain" />
        ) : (
          <span className="font-display text-6xl text-[#6f655d]">{initial}</span>
        )}
      </div>
    </div>
  );
}
