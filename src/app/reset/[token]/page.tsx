import { ResetPasswordForm } from "@/components/AccountForms";

export const metadata = { title: "Set a new password", referrer: "no-referrer" as const, robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="mb-6 font-display text-3xl font-semibold">Set a new password</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}
