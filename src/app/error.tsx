"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-10 text-center" role="alert">
      <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500">An unexpected error occurred while rendering this page.</p>
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
