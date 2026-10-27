"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My RegretNothing list", url });
        return;
      } catch {
        // Fall through to copying if the share sheet was dismissed or unavailable.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-card p-2 pl-4">
      <span className="min-w-0 flex-1 truncate text-[15px] text-muted">{url.replace(/^https?:\/\//, "")}</span>
      <button onClick={share} className="btn-primary !py-2">{copied ? "Copied!" : "Share link"}</button>
    </div>
  );
}
