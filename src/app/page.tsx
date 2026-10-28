import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";

const STEPS = [
  { title: "List what you'd love", body: "Paste a link from any store or just describe it. We grab the photo and price." },
  { title: "List what you already have", body: "The part nobody else does. Gifters see it, so you don't get a third air fryer." },
  { title: "Share one link", body: "Family claims gifts or chips in together. You never see who got what." },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (await currentUser()) redirect("/me");
  const { deleted } = await searchParams;
  return (
    <div className="pt-10 sm:pt-20">
      {deleted ? (
        <p role="status" className="mb-8 rounded-2xl bg-pine-soft px-4 py-3 text-pine">Your account and list are deleted. Thanks for trying RegretNothing.</p>
      ) : null}
      <section className="max-w-2xl">
        <p className="mb-4 inline-block rounded-full bg-berry-soft px-3 py-1 text-sm font-medium text-berry">
          Fewer returns. Fewer regifts. Better gifts.
        </p>
        <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
          Tell people what you want <em className="text-pine">and</em> what you already have.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Americans spend billions a year on gifts nobody wanted. RegretNothing gives the people who love you the
          whole picture, so every gift lands.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">Make my list. It's free</Link>
          <Link href="/login" className="btn-quiet px-6 py-3 text-base">I have an account</Link>
        </div>
      </section>
      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-line bg-card p-6">
            <div className="mb-3 font-display text-3xl text-gold">{i + 1}</div>
            <h2 className="mb-1.5 font-semibold">{s.title}</h2>
            <p className="text-[15px] text-muted">{s.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
