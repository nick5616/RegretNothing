import { describe, expect, it } from "vitest";
import { parseDollars } from "@/lib/money";
import { isPrivateAddress, parseProductHtml } from "@/lib/unfurl";

describe("parseProductHtml", () => {
  it("prefers JSON-LD product data", () => {
    const html = `<html><head><title>Shop</title>
      <meta property="og:title" content="OG name">
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Lodge 12&quot; Skillet",
        "image":["/img/pan.jpg"],"offers":{"@type":"Offer","price":"34.90","priceCurrency":"USD"}}</script></head></html>`;
    expect(parseProductHtml(html, "https://shop.example.com/p/1")).toEqual({
      title: 'Lodge 12" Skillet',
      imageUrl: "https://shop.example.com/img/pan.jpg",
      priceCents: 3490,
    });
  });

  it("falls back to Open Graph tags in any attribute order", () => {
    const html = `<meta content="Wool Socks &amp; More" property="og:title">
      <meta property="og:image" content="https://cdn.example.com/s.png">
      <meta property="product:price:amount" content="$18">`;
    expect(parseProductHtml(html, "https://example.com")).toEqual({
      title: "Wool Socks & More",
      imageUrl: "https://cdn.example.com/s.png",
      priceCents: 1800,
    });
  });

  it("uses <title> when nothing else exists, and drops non-http images", () => {
    const html = `<title> Plain page </title><meta property="og:image" content="javascript:alert(1)">`;
    expect(parseProductHtml(html, "https://example.com")).toEqual({ title: "Plain page", imageUrl: null, priceCents: null });
  });
});

describe("isPrivateAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "::1", "fd00::1", "::ffff:127.0.0.1"])(
    "blocks %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "151.101.1.69", "2606:4700::1111"])("allows %s", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});

describe("parseDollars", () => {
  it.each([["$1,299.99", 129999], ["49", 4900], ["0", null], ["", null], ["abc", null]])("%s -> %s", (input, cents) =>
    expect(parseDollars(input)).toBe(cents),
  );
});

describe("bot walls", () => {
  it("treats a page titled with just the store's name as a failed read", () => {
    const html = `<title>Amazon.com</title><meta property="og:image" content="https://m.media-amazon.com/logo.png">`;
    expect(parseProductHtml(html, "https://www.amazon.com/dp/B00006JSUA")).toEqual({ title: null, imageUrl: null, priceCents: null });
  });
});
