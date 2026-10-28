import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchPublic } from "./unfurl";

export const SHARE_SIZE = { width: 1200, height: 630 };

// Fixed light palette: link previews render on whatever background the chat app uses.
export const C = {
  paper: "#fbf7f1",
  card: "#ffffff",
  ink: "#1f1a17",
  muted: "#6f655d",
  line: "#e8dfd4",
  pine: "#1f5f4a",
  pineSoft: "#e3efe9",
  berry: "#a8243a",
  berrySoft: "#f8e4e6",
  gold: "#b7791f",
};

const fontCache = new Map<string, Promise<Buffer>>();
const font = (file: string) => {
  if (!fontCache.has(file)) fontCache.set(file, readFile(path.join(process.cwd(), "src/assets", file)));
  return fontCache.get(file)!;
};
export const displayFont = () => font("Fraunces-SemiBold.ttf");

/** Fraunces for headlines, Inter (the default for anything without a fontFamily) for everything else. */
export async function shareFonts() {
  return [
    { name: "Inter", data: await font("Inter-Medium.ttf"), weight: 500 as const, style: "normal" as const },
    { name: "Fraunces", data: await displayFont(), weight: 600 as const, style: "normal" as const },
  ];
}

/**
 * Loads a product photo as a data URL the image renderer can draw. Photo links come from users, so this goes
 * through the same guarded fetch as link previews. PNG and JPEG only; anything else is skipped, not drawn broken.
 */
export async function photoData(url: string): Promise<string | null> {
  try {
    const { body, contentType } = await fetchPublic(url, { maxBytes: 3_000_000, accept: "image/jpeg,image/png;q=0.9" });
    const type = contentType.split(";")[0].trim();
    if (type !== "image/jpeg" && type !== "image/png") return null;
    return `data:${type};base64,${body.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The brand mark, as drawn in share images. */
export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: size, color: C.ink }}>
      Regret<span style={{ color: C.berry }}>Nothing</span>
    </div>
  );
}

/**
 * The app icon: a serif R on pine with a berry bow. `bleed` fills the square edge to edge (Android crops it into its own
 * shape); otherwise corners are rounded for favicons and iOS.
 */
export function AppMark({ size, bleed = false }: { size: number; bleed?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        background: C.pine,
        borderRadius: bleed ? 0 : size * 0.22,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: size * (bleed ? 0.5 : 0.66), color: C.paper, marginTop: -size * 0.06 }}>R</div>
      <div
        style={{
          position: "absolute",
          top: size * (bleed ? 0.27 : 0.18),
          right: size * (bleed ? 0.29 : 0.2),
          width: size * 0.13,
          height: size * 0.13,
          borderRadius: size,
          background: "#e7798b",
        }}
      />
    </div>
  );
}

const TILT = [-7, 4, -2];
const TINTS = [C.pineSoft, C.berrySoft, "#f6ead7"];

/** Three cards fanned on a table: product photos first, then lettered tiles for items without one, then plain tints. */
export function PhotoFan({ photos, letters }: { photos: string[]; letters: string[] }) {
  const tiles = [
    ...photos.map((src) => ({ src, letter: "" })),
    ...letters.slice(photos.length).map((letter) => ({ src: "", letter })),
    { src: "", letter: "" },
    { src: "", letter: "" },
    { src: "", letter: "" },
  ].slice(0, 3);
  return (
    <div style={{ display: "flex", position: "relative", width: 470, height: 470 }}>
      {tiles.map((t, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: [0, 150, 70][i],
            top: [40, 10, 190][i],
            width: 270,
            height: 270,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: t.src ? C.card : TINTS[i],
            borderRadius: 28,
            border: `1px solid ${C.line}`,
            boxShadow: "0 24px 50px rgba(60,40,20,0.18)",
            transform: `rotate(${TILT[i]}deg)`,
          }}
        >
          {t.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- rendered by the image generator, not the browser
            <img src={t.src} alt="" width={220} height={220} style={{ objectFit: "contain" }} />
          ) : (
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 120, color: [C.pine, C.berry, C.gold][i] }}>{t.letter}</div>
          )}
        </div>
      ))}
    </div>
  );
}
