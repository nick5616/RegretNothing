"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addItemAction, previewLinkAction, type LinkPreview } from "@/app/actions";

const looksLikeUrl = (s: string) => /^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(s.trim());

const storeName = (site: string) => {
  const name = site.split(".").at(-2) ?? site;
  return name.charAt(0).toUpperCase() + name.slice(1);
};

type Link =
  | { status: "loading"; url: string }
  | { status: "found"; url: string; preview: LinkPreview }
  | { status: "manual"; url: string; site: string };

export function AddItemForm({ kind }: { kind: "want" | "have" }) {
  const [state, action, pending] = useActionState(addItemAction, undefined);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [link, setLink] = useState<Link | null>(null);
  const [group, setGroup] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const latest = useRef("");
  const want = kind === "want";

  useEffect(() => {
    if (!state?.ok) return;
    form.current?.reset();
    setInput("");
    setLink(null);
    setGroup(false);
  }, [state]);

  // Read a pasted link as soon as typing pauses; ignore answers for links since replaced.
  useEffect(() => {
    const url = input.trim();
    if (!looksLikeUrl(url)) {
      setLink(null);
      return;
    }
    latest.current = url;
    setLink({ status: "loading", url });
    const timer = setTimeout(async () => {
      const preview = await previewLinkAction(url).catch(() => null);
      if (latest.current !== url) return;
      if (preview?.title) setLink({ status: "found", url, preview });
      else setLink({ status: "manual", url, site: preview?.site ?? url });
    }, 350);
    return () => clearTimeout(timer);
  }, [input]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-quiet w-full border-dashed text-muted hover:text-ink">
        + {want ? "Add something you'd love" : "Add something you already have"}
      </button>
    );
  }

  const isText = input.trim() !== "" && !link;
  const ready = isText || link?.status === "found" || link?.status === "manual";

  return (
    <form ref={form} action={action} className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <input type="hidden" name="kind" value={kind} />
      {link ? (
        <>
          <input type="hidden" name="url" value={link.url} />
          <input type="hidden" name="previewed" value="1" />
        </>
      ) : null}
      {state?.error ? <p role="alert" className="rounded-xl bg-berry-soft px-3.5 py-2.5 text-sm text-berry">{state.error}</p> : null}

      <input
        name={link ? undefined : "title"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={want ? "Paste a link from any store, or describe it" : "Paste a link, or name it (\"Instant Pot, 6 qt\")"}
        className="field"
        autoFocus
        autoComplete="off"
      />

      {link?.status === "loading" ? <p className="px-1 text-sm text-muted">Reading that page…</p> : null}

      {link?.status === "found" ? (
        <div key={link.url} className="flex gap-3 rounded-xl bg-paper p-3">
          {link.preview.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote store image
            <img src={link.preview.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg bg-card object-contain" />
          ) : null}
          <input type="hidden" name="imageUrl" value={link.preview.imageUrl ?? ""} />
          <div className="min-w-0 flex-1 space-y-2">
            <input name="title" required defaultValue={state?.fields?.title || link.preview.title || ""} aria-label="Name" className="field !py-2 font-medium" />
            <input name="price" inputMode="decimal" defaultValue={state?.fields?.price || link.preview.price || ""} placeholder="Price" aria-label="Price" className="field max-w-32 !py-2" />
          </div>
        </div>
      ) : null}

      {link?.status === "manual" ? (
        <div key={link.url} className="space-y-2 rounded-xl bg-paper p-3">
          <p className="text-sm text-muted">
            {storeName(link.site)} doesn't let us read its pages, so add the details yourself. The link is saved either way.
          </p>
          <input name="title" required defaultValue={state?.fields?.title} placeholder="Name, e.g. the product's title" aria-label="Name" className="field !py-2" autoFocus />
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <input name="price" inputMode="decimal" defaultValue={state?.fields?.price} placeholder="Price" aria-label="Price" className="field !py-2" />
            <input name="imageUrl" inputMode="url" defaultValue={state?.fields?.imageUrl} placeholder="Photo link (optional)" aria-label="Photo link" className="field !py-2" />
          </div>
          <p className="text-xs text-muted">For a photo, right-click the product picture and choose “Copy image address”.</p>
        </div>
      ) : null}

      {ready ? (
        <>
          {isText ? <input name="price" inputMode="decimal" defaultValue={state?.fields?.price} placeholder="Price (optional)" className="field max-w-40" /> : null}
          <input name="notes" defaultValue={state?.fields?.notes} placeholder={want ? "Size, color, \"any of these\"… (optional)" : "Anything gifters should know (optional)"} className="field" />
          {want ? (
            <label className="flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" name="group" checked={group} onChange={(e) => setGroup(e.target.checked)} className="h-4 w-4 accent-pine" />
              Big-ticket? Let people chip in together
            </label>
          ) : null}
          {group ? <input name="groupTarget" inputMode="decimal" defaultValue={state?.fields?.groupTarget} placeholder="Goal amount (defaults to the price)" className="field" /> : null}
        </>
      ) : null}

      <div className="flex gap-2">
        <button disabled={pending || !ready} className="btn-primary flex-1">{pending ? "Adding…" : "Add to list"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-quiet">Done</button>
      </div>
    </form>
  );
}
