"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type DepartmentsResponse = {
  departments: Array<{ id: number; name: string; members: number; lead: string; scope: string }>;
  permissionBands: Array<{ level: string; rights: string }>;
  prc?: {
    connected: boolean;
    staff: Array<{ name: string; role: string | null }>;
    count: number;
    fetchedAt: string | null;
  };
  error?: string;
};

export default function DepartmentsPage() {
  const DEPARTMENTS_DISPLAY_LIMIT = 16;
  const STAFF_DISPLAY_LIMIT = 24;

  const [data, setData] = useState<DepartmentsResponse>({ departments: [], permissionBands: [] });
  const [name, setName] = useState("");
  const [lead, setLead] = useState("");
  const [members, setMembers] = useState(0);
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/panels/departments", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as DepartmentsResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load departments");
    }
    setData(payload);
  }, []);

  useEffect(() => {
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load departments");
    });
  }, [load]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/panels/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lead, members, scope }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create department");
      }
      setName("");
      setScope("");
      await load();
      setMessage("Department created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create department");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Departments</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Department Management</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            placeholder="Department name"
          />
          <input
            value={lead}
            onChange={(event) => setLead(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            placeholder="Lead"
          />
          <input
            type="number"
            min={0}
            value={members}
            onChange={(event) => setMembers(Number(event.target.value))}
            className="w-20 rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
          />
          <input
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="rounded-md border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
            placeholder="Scope"
          />
          <button className="button-primary px-4 py-2 text-sm" type="submit" disabled={loading || !name.trim() || !scope.trim()}>
            {loading ? "Saving..." : "Create department"}
          </button>
        </form>
      </div>
      {message ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{message}</p> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <article className="dashboard-card p-4">
          <h2 className="text-lg font-semibold tracking-tight">Active departments</h2>
          {data.departments.length > DEPARTMENTS_DISPLAY_LIMIT ? (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Showing {DEPARTMENTS_DISPLAY_LIMIT} of {data.departments.length} departments.
            </p>
          ) : null}
          <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1 text-sm">
            {data.departments.slice(0, DEPARTMENTS_DISPLAY_LIMIT).map((dept) => (
              <div key={dept.id.toString()} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="font-semibold">{dept.name}</p>
                <p className="text-[var(--ink-soft)]">Lead: {dept.lead}</p>
                <p className="text-[var(--ink-soft)]">Members: {dept.members}</p>
                <p className="text-xs text-[var(--ink-soft)]">Scope: {dept.scope}</p>
              </div>
            ))}
            {!data.departments.length ? <p className="text-[var(--ink-soft)]">No departments yet.</p> : null}
          </div>
        </article>

        <article className="dashboard-card p-4">
          <h2 className="text-lg font-semibold tracking-tight">Permission bands</h2>
          <div className="mt-3 space-y-2 text-sm">
            {data.permissionBands.map((item) => (
              <div key={item.level} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="font-semibold">{item.level}</p>
                <p className="text-[var(--ink-soft)]">{item.rights}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 dashboard-card p-4">
        <h2 className="text-lg font-semibold tracking-tight">Live PRC staff roster</h2>
        {!data.prc?.connected ? (
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Connect ER:LC to map live staff by rank/permission.</p>
        ) : (
          <>
          {data.prc.staff.length > STAFF_DISPLAY_LIMIT ? (
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Showing {STAFF_DISPLAY_LIMIT} of {data.prc.staff.length} staff entries.
            </p>
          ) : null}
          <div className="mt-3 max-h-[560px] overflow-y-auto pr-1">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.prc.staff.slice(0, STAFF_DISPLAY_LIMIT).map((entry, index) => (
              <div key={`${entry.name}-${index}`} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3 text-sm">
                <p className="font-semibold">{entry.name}</p>
                <p className="text-[var(--ink-soft)]">{entry.role ?? "Role unknown"}</p>
              </div>
            ))}
            {!data.prc.staff.length ? <p className="text-sm text-[var(--ink-soft)]">No staff entries returned by PRC.</p> : null}
          </div>
          </div>
          </>
        )}
      </section>
    </div>
  );
}
