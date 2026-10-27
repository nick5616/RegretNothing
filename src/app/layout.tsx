import type { Metadata } from "next";
import Link from "next/link";
import { logOutAction } from "./actions";
import { currentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "RegretNothing", template: "%s · RegretNothing" },
  description: "Share what you want, and what you already have, so every gift lands.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href={user ? "/me" : "/"} className="font-display text-xl font-semibold tracking-tight">
            Regret<span className="text-berry">Nothing</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            {user ? (
              <>
                <Link href="/me" className="btn-quiet !py-1.5">My list</Link>
                <form action={logOutAction}>
                  <button className="px-2 py-1.5 text-muted hover:text-ink">Log out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="px-2 py-1.5 text-muted hover:text-ink">Log in</Link>
                <Link href="/signup" className="btn-primary !py-1.5">Start a list</Link>
              </>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
