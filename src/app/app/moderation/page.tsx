"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type ModerationCase = {
  id: number;
  caseRef: string;
  type: string;
  player: string;
  status: string;
  owner: string;
  createdAt: string;
};

const safeguards = [
  "Command allowlist enforced by role",
  "All command submissions logged with actor and timestamp",
  "Evidence links required for escalated actions",
  "Webhook notifications for critical moderation events",
];

export default function ModerationPage() {
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [type, setType] = useState("Mod Call");
  const [player, setPlayer] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("Queued");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadCases = useCallback(async () => {
    const response = await fetch("/api/panels/moderation", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as { cases?: ModerationCase[]; error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load moderation cases");
    }
    setCases(payload.cases ?? []);
  }, []);

  useEffect(() => {
    void loadCases().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load moderation cases");
    });
  }, [loadCases]);

  const openCount = useMemo(
    () => cases.filter((item) => !["resolved", "closed"].includes(item.status.toLowerCase())).length,
    [cases],
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, player, owner, status }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create moderation case");
      }
      setPlayer("");
      await loadCases();
      setMessage("Moderation case created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create moderation case");
    } finally {
      setLoading(false);
    }
  }

  async function moveToResolved(id: number) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Resolved", owner: owner || "System" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update case");
      }
      await loadCases();
      setMessage("Case marked as resolved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update case");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className="kicker">Moderation</span>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Operational Moderation Panel</h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">Open queue items: {openCount}</p>
      {message ? <p className="mt-3 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Open moderation queue</h2>
          <div className="mt-3 space-y-2 text-sm">
            {cases.map((item) => (
              <div
                key={item.id.toString()}
                className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.caseRef}</p>
                  <span className="text-xs uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                    {item.status}
                  </span>
                </div>
                <p className="text-[var(--ink-soft)]">{item.type} - {item.player}</p>
                <p className="text-xs text-[var(--ink-soft)]">Owner: {item.owner}</p>
                {!["resolved", "closed"].includes(item.status.toLowerCase()) ? (
                  <button
                    type="button"
                    onClick={() => void moveToResolved(item.id)}
                    className="button-secondary mt-2 px-3 py-1 text-xs"
                    disabled={loading}
                  >
                    Mark resolved
                  </button>
                ) : null}
              </div>
            ))}
            {!cases.length ? <p className="text-[var(--ink-soft)]">No moderation cases yet.</p> : null}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Create moderation case</h2>
          <form onSubmit={handleCreate} className="mt-3 space-y-2">
            <input
              value={player}
              onChange={(event) => setPlayer(event.target.value)}
              className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              placeholder="Player name"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                placeholder="Case type"
              />
              <input
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                placeholder="Status"
              />
            </div>
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              className="w-full rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
              placeholder="Owner (optional)"
            />
            <button className="button-primary mt-1 px-3 py-2 text-sm" type="submit" disabled={loading || !player.trim()}>
              {loading ? "Saving..." : "Create case"}
            </button>
          </form>

          <h3 className="mt-5 text-sm font-semibold uppercase tracking-[0.1em] text-[var(--ink-soft)]">
            Command safeguards
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--ink-soft)]">
            {safeguards.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
