"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type InfractionData = {
  stats: Array<{ type: string; count: number }>;
  cases: Array<{
    id: number;
    caseRef: string;
    target: string;
    level: string;
    issuer: string;
    appealStatus: string;
    createdAt: string;
  }>;
  error?: string;
};

export default function InfractionsPage() {
  const [data, setData] = useState<InfractionData>({ stats: [], cases: [] });
  const [target, setTarget] = useState("");
  const [level, setLevel] = useState("Warning");
  const [issuer, setIssuer] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/infractions", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as InfractionData;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load infractions");
    }
    setData(payload);
  }, []);

  useEffect(() => {
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load infractions");
    });
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/infractions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, level, issuer }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create infraction");
      }
      setTarget("");
      await load();
      setMessage("Infraction logged.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create infraction");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className="kicker">Infractions</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Disciplinary Workflow</h1>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.stats.map((item) => (
          <article key={item.type} className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">{item.type}</p>
            <p className="mt-1 text-2xl font-semibold">{item.count}</p>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Recent cases</h2>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
            <input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              placeholder="Target"
            />
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            >
              <option>Warning</option>
              <option>Strike</option>
              <option>Suspension</option>
              <option>Termination</option>
            </select>
            <input
              value={issuer}
              onChange={(event) => setIssuer(event.target.value)}
              className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              placeholder="Issuer (optional)"
            />
            <button className="button-primary px-3 py-2 text-sm" type="submit" disabled={loading || !target.trim()}>
              {loading ? "Saving..." : "Log infraction"}
            </button>
          </form>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {data.cases.map((item) => (
            <div
              key={item.id.toString()}
              className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{item.caseRef} - {item.level}</p>
                <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                  Appeal: {item.appealStatus}
                </span>
              </div>
              <p className="text-[var(--ink-soft)]">Target: {item.target}</p>
              <p className="text-xs text-[var(--ink-soft)]">Issued by: {item.issuer}</p>
            </div>
          ))}
          {!data.cases.length ? <p className="text-[var(--ink-soft)]">No infractions logged yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
