import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/AuthForms";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Start a list" };

export default async function SignUpPage() {
  if (await currentUser()) redirect("/me");
  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="mb-6 font-display text-3xl font-semibold">Start your list</h1>
      <SignUpForm />
    </div>
  );
}
