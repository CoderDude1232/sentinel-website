import Link from "next/link";

type AccessDeniedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const reasonContent: Record<string, { title: string; description: string }> = {
  devtools: {
    title: "This session is blocked.",
    description: "Developer tools were detected and this view is unavailable in the current session.",
  },
  oauth_intent: {
    title: "Direct login access is blocked.",
    description: "Start Discord sign-in from Sentinel's sign-in button to continue.",
  },
};

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? params.reason : "";
  const content = reasonContent[reason] ?? {
    title: "Access denied.",
    description: "This request is not allowed in the current session.",
  };

  return (
    <main className="mx-auto min-h-[76vh] w-full max-w-5xl px-5 py-10 sm:px-8">
      <section className="glass-card mx-auto max-w-2xl p-6 text-center sm:p-8">
        <span className="kicker">Access denied</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {content.title}
        </h1>
        <p className="mt-3 text-sm text-[var(--ink-soft)] sm:text-base">
          {content.description}
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
