import { ImageResponse } from "next/og";
import { AppMark, displayFont } from "@/lib/shareImage";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(<AppMark size={64} />, {
    ...size,
    fonts: [{ name: "Fraunces", data: await displayFont(), weight: 600, style: "normal" }],
  });
}
