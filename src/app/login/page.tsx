const securityItems = [
  "OAuth state validation on callback",
  "Encrypted provider token storage",
  "Workspace role checks per action",
  "Full authentication audit logs",
];

const providerRoadmap = [
  { provider: "Discord", status: "Active" },
  { provider: "Email", status: "Planned" },
  { provider: "Google", status: "Planned" },
];

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-8 sm:px-8 sm:py-10">
      <section className="grid w-full gap-4 md:grid-cols-[1.05fr_0.95fr]">
        <article className="glass-card p-6 sm:p-8">
          <span className="kicker">Authentication</span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Access Sentinel through Discord.
          </h1>
          <p className="mt-3 text-sm text-[var(--ink-soft)]">
            Sign in with Discord to access your workspace. Additional auth
            providers are planned on the same account-link architecture.
          </p>
          <button className="button-primary mt-6 w-full px-4 py-3 text-sm">
            Continue with Discord
          </button>
          <p className="mt-3 text-xs text-[var(--ink-soft)]">
            By continuing, you agree to Sentinel terms and privacy policy.
          </p>
        </article>

        <article className="glass-card p-6">
          <h2 className="text-lg font-semibold tracking-tight">Access model</h2>
          <div className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
            {providerRoadmap.map((item) => (
              <div
                key={item.provider}
                className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <span>{item.provider}</span>
                <span className="text-xs uppercase tracking-[0.1em]">{item.status}</span>
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            Security controls
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink-soft)]">
            {securityItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
