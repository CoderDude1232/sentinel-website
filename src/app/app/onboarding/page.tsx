"use client";

import { useCallback, useEffect, useState } from "react";

type OnboardingResponse = {
  steps: Array<{ step: string; status: "Complete" | "In progress" | "Pending"; detail: string }>;
  error?: string;
};

export default function OnboardingPage() {
  const [steps, setSteps] = useState<OnboardingResponse["steps"]>([]);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/onboarding", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as OnboardingResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load onboarding flow");
    }
    setSteps(payload.steps ?? []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load().catch((error) => {
        setMessage(error instanceof Error ? error.message : "Failed to load onboarding flow");
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Onboarding</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspace Setup Flow</h1>
        </div>
        <button onClick={() => void load()} className="button-primary px-4 py-2 text-sm" type="button">
          Refresh setup
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

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
