import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="mx-auto min-h-[76vh] w-full max-w-5xl px-5 py-10 sm:px-8">
      <section className="glass-card mx-auto max-w-2xl p-6 text-center sm:p-8">
        <span className="kicker">Access denied</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          This session is blocked.
        </h1>
        <p className="mt-3 text-sm text-[var(--ink-soft)] sm:text-base">
          Developer tools were detected and this view is unavailable in the current session.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="button-primary w-full px-5 py-2.5 text-sm sm:w-auto">
            Return Home
          </Link>
          <Link href="/login" className="button-secondary w-full px-5 py-2.5 text-sm sm:w-auto">
            Open Login
          </Link>
        </div>
      </section>
    </main>
  );
}
