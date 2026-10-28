import { redirect } from "next/navigation";
import type { AddStart } from "@/components/AddItemForm";
import { AddFromLink } from "@/components/AddFromLink";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Add to my list" };

type Search = { url?: string; title?: string; image?: string; price?: string; text?: string; via?: string };

// Share sheets often put the link inside the text ("Wool Runners https://a.co/d/xyz").
const firstUrl = (s?: string) => s?.match(/https?:\/\/\S+/)?.[0];

/** Where the store button, the phone share sheet and plain links all land. */
export default async function AddPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  if (!(await currentUser())) {
    const back = `/add?${new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][])}`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  const url = sp.url || firstUrl(sp.text);
  // Only the store button reads the page itself; a share sheet's title is just the page title, so read the link instead.
  const fromButton = sp.via === "button" && !!sp.title;
  const start: AddStart | undefined = url
    ? fromButton
      ? { url, title: sp.title!.slice(0, 200), imageUrl: sp.image, price: sp.price }
      : { url }
    : undefined;

  return (
    <div className="mx-auto max-w-lg pt-6">
      <h1 className="mb-5 font-display text-3xl font-semibold">Add to your list</h1>
      <AddFromLink start={start} />
    </div>
  );
}
