import { headers } from "next/headers";
import { AddItemForm } from "@/components/AddItemForm";
import { CopyLink } from "@/components/CopyLink";
import { ItemCard } from "@/components/ItemCard";
import { getDb } from "@/lib/db";
import { ownItems } from "@/lib/gifts";
import { requireUser } from "@/lib/session";
import { deleteItemAction } from "../actions";

export const metadata = { title: "My list" };

function DeleteButton({ itemId }: { itemId: string }) {
  return (
    <form action={deleteItemAction} className="mt-2">
      <input type="hidden" name="itemId" value={itemId} />
      <button className="text-sm text-muted underline decoration-line hover:text-berry">Remove</button>
    </form>
  );
}

export default async function MyListPage() {
  const user = await requireUser();
  const { want, have } = await ownItems(await getDb(), user.id);
  const h = await headers();
  const origin = process.env.APP_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const shareUrl = `${origin}/u/${user.handle}`;

  return (
    <div className="pt-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Hi, {user.name.split(" ")[0]}</h1>
          <p className="mt-1 text-muted">
            Claims and chip-ins stay hidden from you. <a href={`/u/${user.handle}`} className="text-pine underline">See what gifters see</a>.
          </p>
        </div>
        <div className="sm:w-96"><CopyLink url={shareUrl} /></div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-1 font-display text-2xl font-semibold">What I'd love <span className="text-muted">· {want.length}</span></h2>
          <p className="mb-4 text-[15px] text-muted">Links, ideas, sizes. The more specific, the better the gift.</p>
          <div className="space-y-3">
            <AddItemForm kind="want" />
            {want.map((item) => (
              <ItemCard key={item.id} item={item}><DeleteButton itemId={item.id} /></ItemCard>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-1 font-display text-2xl font-semibold">What I already have <span className="text-muted">· {have.length}</span></h2>
          <p className="mb-4 text-[15px] text-muted">So nobody buys you a duplicate, and they can get things that go with it.</p>
          <div className="space-y-3">
            <AddItemForm kind="have" />
            {have.map((item) => (
              <ItemCard key={item.id} item={item}><DeleteButton itemId={item.id} /></ItemCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
