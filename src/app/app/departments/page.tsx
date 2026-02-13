const departments = [
  { name: "Law Enforcement", members: 14, lead: "Lt. Hayes", scope: "Full moderation + session host" },
  { name: "Communications", members: 7, lead: "Sgt. Morrow", scope: "Alert handling + dispatch oversight" },
  { name: "Training", members: 5, lead: "Officer Lane", scope: "Session planning + attendance control" },
];

const permissionBands = [
  { level: "Owner/Admin", rights: "Workspace settings, command policy, retention control" },
  { level: "Moderator", rights: "Moderation actions, infractions logging, session operations" },
  { level: "Viewer", rights: "Read-only dashboards and logs" },
];

export default function DepartmentsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Departments</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Department Management</h1>
        </div>
        <button className="button-primary px-4 py-2 text-sm">Create department</button>
      </div>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Active departments</h2>
          <div className="mt-3 space-y-2 text-sm">
            {departments.map((dept) => (
              <div key={dept.name} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="font-semibold">{dept.name}</p>
                <p className="text-[var(--ink-soft)]">Lead: {dept.lead}</p>
                <p className="text-[var(--ink-soft)]">Members: {dept.members}</p>
                <p className="text-xs text-[var(--ink-soft)]">Scope: {dept.scope}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
          <h2 className="text-lg font-semibold tracking-tight">Permission bands</h2>
          <div className="mt-3 space-y-2 text-sm">
            {permissionBands.map((item) => (
              <div key={item.level} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
                <p className="font-semibold">{item.level}</p>
                <p className="text-[var(--ink-soft)]">{item.rights}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
