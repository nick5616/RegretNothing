import { ImageResponse } from "next/og";
import { AppMark, displayFont } from "@/lib/shareImage";

// /icons/192, /icons/512 and /icons/maskable for the web app manifest.
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const name = (await params).size;
  const bleed = name === "maskable";
  const size = name === "192" ? 192 : 512;
  return new ImageResponse(<AppMark size={size} bleed={bleed} />, {
    width: size,
    height: size,
    fonts: [{ name: "Fraunces", data: await displayFont(), weight: 600, style: "normal" }],
    headers: { "cache-control": "public, max-age=86400, immutable" },
  });
}
