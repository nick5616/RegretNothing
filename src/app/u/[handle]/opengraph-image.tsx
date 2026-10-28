import { ImageResponse } from "next/og";
import { getDb } from "@/lib/db";
import { publicList } from "@/lib/gifts";
import { C, PhotoFan, SHARE_SIZE, Wordmark, shareFonts, photoData } from "@/lib/shareImage";

export const size = SHARE_SIZE;
export const contentType = "image/png";
export const alt = "A gift list on RegretNothing";

/** The card a list link unfurls into in iMessage, WhatsApp, Slack and the rest. Never shows claims. */
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const list = await publicList(await getDb(), handle, { userId: null, gifterHash: null });
  const first = list?.owner.name.split(" ")[0] ?? "someone";
  const wants = list?.wants ?? [];
  const haves = list?.haves.length ?? 0;

  const withPhotos = wants.filter((w) => w.imageUrl).slice(0, 6);
  const photos = (await Promise.all(withPhotos.map((w) => photoData(w.imageUrl!)))).filter((p): p is string => !!p).slice(0, 3);
  // Items with photos come first in the fan, so the letters line up with the rest.
  const letters = [...withPhotos, ...wants.filter((w) => !w.imageUrl)].map((w) => w.title.slice(0, 1).toUpperCase());

  const summary = wants.length
    ? `${wants.length} gift ${wants.length === 1 ? "idea" : "ideas"}${haves ? `, plus ${haves} ${haves === 1 ? "thing" : "things"} ${first} already has` : ""}`
    : `See what ${first} would love`;

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.paper, padding: "64px 64px 64px 80px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <Wordmark />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 104, lineHeight: 1, color: C.ink, letterSpacing: -2 }}>
              Shopping for {first}?
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 34, lineHeight: 1.3, color: C.muted }}>{summary}</div>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", background: C.pine, color: C.paper, fontSize: 30, padding: "16px 30px", borderRadius: 18 }}>
              See the list →
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <PhotoFan photos={photos} letters={letters} />
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: await shareFonts() },
  );
}
