import { redirect } from "next/navigation";
import { LogInForm } from "@/components/AuthForms";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Log in" };

export default async function LogInPage() {
  if (await currentUser()) redirect("/me");
  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="mb-6 font-display text-3xl font-semibold">Welcome back</h1>
      <LogInForm />
    </div>
  );
}
