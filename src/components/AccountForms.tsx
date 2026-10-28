"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteAccountAction, forgotPasswordAction, resetPasswordAction } from "@/app/actions";

function ErrorNote({ error }: { error?: string }) {
  if (!error) return null;
  return <p role="alert" className="rounded-xl bg-berry-soft px-3.5 py-2.5 text-sm text-berry">{error}</p>;
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  if (state?.ok) {
    return (
      <div className="space-y-3 rounded-2xl border border-line bg-card p-5 text-[17px]">
        <p>If <span className="font-medium">{state.fields?.email}</span> has a list, a reset link is on its way. It works for an hour.</p>
        <p className="text-muted">Nothing after a few minutes? Check your spam folder.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <ErrorNote error={state?.error} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">The email you signed up with</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.fields?.email} className="field" />
      </label>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Sending…" : "Email me a reset link"}</button>
      <p className="text-center text-sm text-muted">
        Remembered it? <Link href="/login" className="text-pine underline">Log in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <ErrorNote error={state?.error} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">New password</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" autoFocus />
      </label>
      <button disabled={pending} className="btn-primary w-full">{pending ? "Saving…" : "Set password and log in"}</button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, undefined);
  return (
    <details className="mt-16 rounded-2xl border border-line p-4 text-[15px]">
      <summary className="cursor-pointer text-muted">Delete my account</summary>
      <form action={action} className="mt-4 max-w-sm space-y-3">
        <p className="text-muted">This deletes your list and everything on it, for good. Gifters&apos; receipts for it stop working.</p>
        <ErrorNote error={state?.error} />
        <input name="password" type="password" required placeholder="Your password, to confirm" autoComplete="current-password" className="field" />
        <button disabled={pending} className="btn w-full border border-berry/40 text-berry hover:bg-berry-soft">{pending ? "Deleting…" : "Delete everything"}</button>
      </form>
    </details>
  );
}
