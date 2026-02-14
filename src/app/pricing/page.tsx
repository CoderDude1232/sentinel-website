import Link from "next/link";
import { PublicHero } from "@/components/public-hero";

const plans = [
  {
    name: "Solo Workspace",
    price: "$9/mo",
    description: "For individual owners managing one ER:LC server.",
    features: [
      "1 connected server",
      "Moderation, activity, infractions, sessions",
      "Discord webhook alerts",
      "30 or 90 day retention options",
    ],
  },
  {
    name: "Team Workspace",
    price: "$24/mo",
    description: "For communities with shared staff operations.",
    features: [
      "Up to 2 connected servers",
      "Department RBAC and invite workflows",
      "Expanded audit history and alert routing",
      "Priority support window",
    ],
  },
  {
    name: "Enterprise",
    price: "Contact",
    description: "For large operations requiring custom policy controls.",
    features: [
      "Custom onboarding assistance",
      "Policy and workflow tailoring",
      "Webhook strategy review",
      "Dedicated integration planning",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <PublicHero
        kicker="Pricing"
        title="Plans sized for solo and team operations."
        description="Plan structure follows your server model: individual workspace owners run one server, team workspaces can run two."
      />

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="glass-card flex flex-col p-5">
            <h2 className="text-xl font-semibold tracking-tight">{plan.name}</h2>
            <p className="mt-1 text-3xl font-semibold">{plan.price}</p>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{plan.description}</p>
            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-[var(--ink-soft)]">
              {plan.features.map((feature) => (
                <li key={feature}>- {feature}</li>
              ))}
            </ul>
            <Link href="/login" className="button-secondary mt-5 px-3 py-2 text-sm">
              Choose {plan.name}
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-5 glass-card flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-[var(--ink-soft)]">
          Need procurement details or custom terms for your organization?
        </p>
        <Link href="/contact" className="button-primary px-4 py-2 text-sm">
          Contact sales
        </Link>
      </section>
    </main>
  );
}
