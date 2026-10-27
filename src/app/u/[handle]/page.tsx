import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GifterActions } from "@/components/GifterActions";
import { ItemCard } from "@/components/ItemCard";
import { getDb } from "@/lib/db";
import { publicList } from "@/lib/gifts";
import { currentUser, readGifterHash } from "@/lib/session";

type Props = { params: Promise<{ handle: string }> };

async function load(handle: string) {
  const viewer = await currentUser();
  return publicList(await getDb(), handle, { userId: viewer?.id ?? null, gifterHash: await readGifterHash() });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = await load((await params).handle);
  if (!list) return { title: "List not found" };
  const first = list.owner.name.split(" ")[0];
  return {
    title: `${list.owner.name}'s list`,
    description: `See what ${first} would love, and what they already have, before you buy.`,
    openGraph: { title: `Shopping for ${first}?`, description: `${list.wants.length} ideas and ${list.haves.length} things they already have.` },
  };
}

export default async function PublicListPage({ params }: Props) {
  const { handle } = await params;
  const list = await load(handle);
  if (!list) notFound();
  const first = list.owner.name.split(" ")[0];
  const open = list.wants.filter((w) => !w.claim && (!w.groupTargetCents || w.pledgedCents < w.groupTargetCents));

  return (
    <div className="pt-6">
      {list.isOwner ? (
        <div className="mb-6 rounded-2xl bg-gold/10 px-4 py-3 text-[15px]">
          This is your list as gifters see it, with claims hidden so the surprise stays a surprise.
        </div>
      ) : null}
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Shopping for {first}?</h1>
      <p className="mt-1 mb-8 text-muted">
        {list.isOwner
          ? `${list.wants.length} ideas and ${list.haves.length} things you already have.`
          : `${open.length} of ${list.wants.length} ideas are still up for grabs. Check what ${first} already has before you buy.`}
      </p>

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">{first} would love</h2>
          {list.wants.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-muted">Nothing here yet.</p>
          ) : (
            <div className="space-y-3">
              {list.wants.map((item) => (
                <ItemCard key={item.id} item={item} muted={!!item.claim && !item.claim.mine}>
                  {list.isOwner ? null : <GifterActions item={item} handle={list.owner.handle} />}
                </ItemCard>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-1 font-display text-2xl font-semibold">Already has</h2>
          <p className="mb-4 text-[15px] text-muted">Skip these, or find something that goes with them.</p>
          {list.haves.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-muted">Nothing listed yet.</p>
          ) : (
            <div className="space-y-3">
              {list.haves.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
