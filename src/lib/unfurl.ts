import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type Unfurled = { title: string | null; imageUrl: string | null; priceCents: number | null };

const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;

/** True for loopback, private, link-local, CGNAT and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
  const addrs = isIP(url.hostname) ? [{ address: url.hostname }] : await lookup(url.hostname, { all: true });
  if (addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address))) throw new Error("private address");
  return url;
}

async function fetchHtml(raw: string): Promise<{ html: string; finalUrl: URL }> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; RegretNothingBot/0.1; +https://regretnothing.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      // Re-check every hop so a redirect can't bounce us onto an internal host.
      url = await assertPublicUrl(new URL(next, url).toString());
      continue;
    }
    if (!res.ok || !res.body) throw new Error(`status ${res.status}`);

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => {});
    return { html: Buffer.concat(chunks).toString("utf8"), finalUrl: url };
  }
  throw new Error("too many redirects");
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

function metaContent(html: string, keys: string[]): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!key || !keys.includes(key)) continue;
    const content = /content\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (content) return decode(content);
  }
  return null;
}

function jsonLdProduct(html: string): { name?: string; image?: string; price?: string } {
  const blocks = html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      continue;
    }
    const nodes = ([] as unknown[]).concat(data, (data as { "@graph"?: unknown[] })?.["@graph"] ?? []);
    for (const node of nodes as Record<string, unknown>[]) {
      const type = node?.["@type"];
      if (!(type === "Product" || (Array.isArray(type) && type.includes("Product")))) continue;
      const offers = ([] as Record<string, unknown>[]).concat((node.offers as Record<string, unknown>) ?? [])[0];
      const image = ([] as unknown[]).concat(node.image ?? [])[0];
      return {
        name: typeof node.name === "string" ? node.name : undefined,
        image: typeof image === "string" ? image : (image as { url?: string })?.url,
        price: offers?.price != null ? String(offers.price) : (offers?.lowPrice as string | undefined),
      };
    }
  }
  return {};
}

function toCents(price: string | null | undefined): number | null {
  if (!price) return null;
  const n = Number(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** Pulls a product title, image and price out of a page's HTML. Exported for tests. */
export function parseProductHtml(html: string, baseUrl: string): Unfurled {
  const ld = jsonLdProduct(html);
  const title =
    (ld.name ? decode(ld.name) : null) ??
    metaContent(html, ["og:title", "twitter:title"]) ??
    (/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ? decode(/<title[^>]*>([^<]*)<\/title>/i.exec(html)![1]) : null);
  const image = ld.image ?? metaContent(html, ["og:image", "og:image:secure_url", "twitter:image"]);
  const price = ld.price ?? metaContent(html, ["product:price:amount", "og:price:amount", "price"]);

  // A bot wall usually comes back titled just "Amazon" or "Target": that's the store, not the product.
  const site = new URL(baseUrl).hostname.replace(/^www\./, "").split(".")[0];
  const bare = (s: string) => s.toLowerCase().replace(/\.(com|net|org|co|us|ca|co\.uk)\b/g, "").replace(/[^a-z0-9]/g, "");
  if (!title || bare(title) === bare(site)) {
    return { title: null, imageUrl: null, priceCents: null };
  }

  let imageUrl: string | null = null;
  if (image) {
    try {
      const abs = new URL(image, baseUrl);
      if (abs.protocol === "https:" || abs.protocol === "http:") imageUrl = abs.toString();
    } catch {}
  }
  return { title: title.slice(0, 200), imageUrl, priceCents: toCents(price) };
}

/** Best effort: many big retailers block bots, so callers must cope with nulls. */
export async function unfurl(url: string): Promise<Unfurled> {
  try {
    const { html, finalUrl } = await fetchHtml(url);
    return parseProductHtml(html, finalUrl.toString());
  } catch {
    return { title: null, imageUrl: null, priceCents: null };
  }
}
