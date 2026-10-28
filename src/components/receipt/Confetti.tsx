import type { CSSProperties } from "react";

const COLORS = ["var(--color-berry)", "var(--color-gold)", "var(--color-pine)", "#f2c14e", "#e7798b", "#8fd3b6"];

// Seeded so the server and browser draw the same pieces.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One celebratory fall of paper, timed to land as the gifter's slice finishes sweeping in. */
export function Confetti({ count = 90 }: { count?: number }) {
  const rand = random(7);
  return (
    <div className="rn-confetti" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const w = 6 + rand() * 8;
        const round = rand() < 0.3;
        const style = {
          left: `${rand() * 100}%`,
          width: w,
          height: round ? w : w * (0.4 + rand() * 0.5),
          background: COLORS[i % COLORS.length],
          borderRadius: round ? "50%" : 2,
          "--dx": `${(rand() - 0.5) * 30}vw`,
          "--spin": `${(rand() < 0.5 ? -1 : 1) * (360 + rand() * 720)}deg`,
          "--dur": `${2.6 + rand() * 2.2}s`,
          "--at": `${1.9 + rand() * 1.1}s`,
        } as CSSProperties;
        return <i key={i} style={style} />;
      })}
    </div>
  );
}
