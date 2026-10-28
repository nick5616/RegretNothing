import { ForgotPasswordForm } from "@/components/AccountForms";

export const metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="mb-2 font-display text-3xl font-semibold">Forgot your password?</h1>
      <p className="mb-6 text-muted">It happens. We&apos;ll email you a link to set a new one.</p>
      <ForgotPasswordForm />
    </div>
  );
}
