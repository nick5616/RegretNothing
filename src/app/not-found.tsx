import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md pt-20 text-center">
      <h1 className="font-display text-3xl font-semibold">Nothing here</h1>
      <p className="mt-2 text-muted">That list doesn't exist, or the link has a typo.</p>
      <Link href="/" className="btn-primary mt-6">Go home</Link>
    </div>
  );
}
