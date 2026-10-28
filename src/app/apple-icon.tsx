import { ImageResponse } from "next/og";
import { AppMark, displayFont } from "@/lib/shareImage";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so draw edge to edge.
export default async function AppleIcon() {
  return new ImageResponse(<AppMark size={180} bleed />, {
    ...size,
    fonts: [{ name: "Fraunces", data: await displayFont(), weight: 600, style: "normal" }],
  });
}
