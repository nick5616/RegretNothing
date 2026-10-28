import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/AuthForms";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Start a list" };

export default async function SignUpPage() {
  if (await currentUser()) redirect("/me");
  const host = process.env.APP_URL ? new URL(process.env.APP_URL).host : ((await headers()).get("host") ?? "");
  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="mb-6 font-display text-3xl font-semibold">Start your list</h1>
      <SignUpForm host={host} />
    </div>
  );
}
