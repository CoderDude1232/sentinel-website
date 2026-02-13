const steps = [
  { step: "Create workspace", status: "Complete", detail: "Workspace profile and ownership established." },
  { step: "Invite core staff", status: "In progress", detail: "2 pending invites waiting for acceptance." },
  { step: "Connect ER:LC server", status: "Pending", detail: "Server key validation has not started." },
  { step: "Define departments", status: "Pending", detail: "Department structure not configured." },
  { step: "Configure retention and alerts", status: "Pending", detail: "Retention window and webhook events not set." },
  { step: "Finalize permissions", status: "Pending", detail: "Role policy and department overrides not confirmed." },
];

export default function OnboardingPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Onboarding</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspace Setup Flow</h1>
        </div>
        <button className="button-primary px-4 py-2 text-sm">Continue setup</button>
      </div>

      <div className="mt-5 space-y-3">
        {steps.map((item, index) => (
          <article
            key={item.step}
            className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {index + 1}. {item.step}
              </h2>
              <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                {item.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--ink-soft)]">{item.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
