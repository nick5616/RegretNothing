export const metadata = { title: "Privacy" };

const SECTIONS: [string, React.ReactNode][] = [
  [
    "What we keep",
    <>
      If you make a list: your name, email, a scrambled version of your password (we can&apos;t read it), and what you put on
      the list. If you give a gift: the name you type, and your email only if you choose to give it.
    </>,
  ],
  [
    "Who sees it",
    <>
      Anyone with your list&apos;s link can see the list. Other gifters see who claimed what, so nobody buys the same thing
      twice. The person whose list it is never sees who claimed or chipped in. That&apos;s the whole point.
    </>,
  ],
  [
    "What we don't do",
    <>
      We don&apos;t sell your information, show ads, or email you anything you didn&apos;t ask for. We only email to send a
      receipt you asked for or a password reset.
    </>,
  ],
  [
    "Cookies",
    <>
      One keeps you logged in. One lets this browser recognize gifts it made, so you can change them. No tracking or
      advertising cookies.
    </>,
  ],
  [
    "Pasted links",
    <>
      When you paste a store link, our server visits that page once to read the product&apos;s name, photo and price.
    </>,
  ],
  [
    "Leaving",
    <>
      Delete your account from the bottom of your list page, and your list goes with it. Gifters can cancel a gift any
      time from their receipt.
    </>,
  ],
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl pt-8">
      <h1 className="font-display text-4xl font-semibold">Privacy, in plain words</h1>
      <p className="mt-2 text-lg text-muted">RegretNothing exists to help people give better gifts. It doesn&apos;t make money from your data.</p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="mb-1.5 text-lg font-semibold">{title}</h2>
            <p className="text-[17px] leading-relaxed text-muted">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
