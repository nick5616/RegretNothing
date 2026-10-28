import { ImageResponse } from "next/og";
import { C, PhotoFan, SHARE_SIZE, Wordmark, shareFonts } from "@/lib/shareImage";

export const size = SHARE_SIZE;
export const contentType = "image/png";
export const alt = "RegretNothing: share what you want, and what you already have";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: C.paper, padding: "64px 64px 64px 80px" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 580 }}>
          <Wordmark />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 68, lineHeight: 1.06, color: C.ink, letterSpacing: -1.5 }}>
              Tell people what you want, and what you already have.
            </div>
            <div style={{ display: "flex", marginTop: 26, fontSize: 32, color: C.muted }}>One link. Every gift lands.</div>
          </div>
          <div style={{ display: "flex" }} />
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <PhotoFan photos={[]} letters={["R", "N"]} />
        </div>
      </div>
    ),
    { ...SHARE_SIZE, fonts: await shareFonts() },
  );
}
