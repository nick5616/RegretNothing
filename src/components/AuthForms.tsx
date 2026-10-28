"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { logInAction, signUpAction } from "@/app/actions";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return <p role="alert" className="rounded-xl bg-berry-soft px-3.5 py-2.5 text-sm text-berry">{error}</p>;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

export function SignUpForm({ host }: { host: string }) {
  const [state, action, pending] = useActionState(signUpAction, undefined);
  const [handle, setHandle] = useState(state?.fields?.handle ?? "");
  const [touched, setTouched] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state?.error} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Your name</span>
        <input
          name="name"
          required
          autoComplete="name"
          defaultValue={state?.fields?.name}
          onChange={(e) => !touched && setHandle(slug(e.target.value))}
          className="field"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.fields?.email} className="field" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Your list's link</span>
        <div className="flex items-center rounded-xl border border-line bg-card pl-3.5 focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/20">
          <span className="text-[15px] text-muted">{host}/u/</span>
          <input
            name="handle"
            required
            value={handle}
            onChange={(e) => {
              setTouched(true);
              setHandle(slug(e.target.value));
            }}
            className="w-full bg-transparent py-2.5 pr-3.5 text-[15px] outline-none"
          />
        </div>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Password</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
      </label>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Creating…" : "Create my list"}</button>
      <p className="text-center text-sm text-muted">
        Already have one? <Link href="/login" className="text-pine underline">Log in</Link>
      </p>
    </form>
  );
}

export function LogInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(logInAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <ErrorNote error={state?.error} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.fields?.email} className="field" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      <p className="-mt-2 text-right text-sm">
        <Link href="/forgot" className="text-muted underline hover:text-ink">Forgot your password?</Link>
      </p>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Logging in…" : "Log in"}</button>
      <p className="text-center text-sm text-muted">
        New here? <Link href="/signup" className="text-pine underline">Start a list</Link>
      </p>
    </form>
  );
}
