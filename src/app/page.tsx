import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 sm:px-8">
      <section className="hero-shell">
        <div className="mx-auto w-full max-w-5xl text-center">
          <p className="hero-subtle stagger-rise">
            Command infrastructure for ER:LC operations
          </p>
          <h1 className="hero-wordmark stagger-rise delay-1 mt-4 flex items-center justify-center gap-3 sm:gap-4">
            <Image
              src="/logo.png"
              alt="Sentinel logo"
              width={132}
              height={132}
              className="brand-logo brand-logo-hero h-20 w-20 sm:h-28 sm:w-28"
              priority
            />
            <span>sentinel</span>
          </h1>
          <p className="hero-subtle stagger-rise delay-2 mx-auto mt-6 max-w-3xl">
            Real-time moderation oversight, staff analytics, and operational
            control in one platform.
          </p>

          <div className="stagger-rise delay-3 mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link href="/app" className="button-primary px-6 py-3 text-base">
              Launch Dashboard
            </Link>
            <Link href="/app/onboarding" className="button-secondary px-6 py-3 text-base">
              Connect ER:LC Server
            </Link>
            <Link href="/api/auth/discord/login" className="button-secondary px-6 py-3 text-base">
              Sign In with Discord
            </Link>
          </div>

          <p className="mt-7 text-base text-[var(--ink-soft)]">
            By using Sentinel, you agree to our{" "}
            <Link href="/terms" className="text-[var(--ink-strong)] hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[var(--ink-strong)] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
