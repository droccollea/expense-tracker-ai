import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="btn-primary mt-6">Back to dashboard</Link>
    </div>
  );
}
