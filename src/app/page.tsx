import Image from "next/image";
import Link from "next/link";

const LANDING_CARDS: Array<{ src: string; alt: string; label: string; title: string }> = [
  {
    src: "/cinematic1.png",
    alt: "Sentinel cinematic scene one",
    label: "Moderation View",
    title: "Live oversight in active situations",
  },
  {
    src: "/cinematic2.png",
    alt: "Sentinel cinematic scene two",
    label: "Activity Command",
    title: "Track staff performance and outcomes",
  },
  {
    src: "/cinematic3.png",
    alt: "Sentinel cinematic scene three",
    label: "Infraction Control",
    title: "Document actions with clear timelines",
  },
  {
    src: "/cinematic4.png",
    alt: "Sentinel cinematic scene four",
    label: "Session Board",
    title: "Coordinate turnout and monitor impact",
  },
  {
    src: "/cinematic5.png",
    alt: "Sentinel cinematic scene five",
    label: "Department Ops",
    title: "Organize teams with role clarity",
  },
  {
    src: "/cinematic6.png",
    alt: "Sentinel cinematic scene six",
    label: "Alert Relay",
    title: "Push critical updates across channels",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 sm:px-8">
      <section className="hero-shell">
        <div className="mx-auto w-full max-w-5xl text-center">
          <p className="hero-subtle stagger-rise">
            Command infrastructure for ER:LC operations
          </p>
          <h1 className="hero-wordmark stagger-rise delay-1 mt-4 flex items-center justify-center gap-3 max-[480px]:flex-col max-[480px]:gap-2 sm:gap-4">
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
            <Link href="/app" className="button-primary w-full px-6 py-3 text-base sm:w-auto">
              Launch Dashboard
            </Link>
            <Link href="/app/onboarding" className="button-secondary w-full px-6 py-3 text-base sm:w-auto">
              Connect ER:LC Server
            </Link>
            <form action="/api/auth/discord/start" method="POST" className="w-full sm:w-auto">
              <button type="submit" className="button-secondary w-full px-6 py-3 text-base sm:w-auto">
                Sign In with Discord
              </button>
            </form>
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

      <section className="mx-auto mb-16 mt-2 w-full max-w-6xl">
        <div className="mb-4 px-1">
          <p className="kicker">Cinematics</p>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            Operational visuals from core Sentinel modules.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_CARDS.map((card) => (
            <article key={card.src} className="cinematic-card">
              <Image
                src={card.src}
                alt={card.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                quality={100}
                priority={false}
              />
              <div className="cinematic-overlay" />
              <div className="cinematic-caption">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                  {card.label}
                </p>
                <p className="mt-1 text-base font-semibold">{card.title}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
