const members = [
  { name: "Ethan Daly", role: "Owner", department: "Law Enforcement", status: "Active" },
  { name: "Lt. Hayes", role: "Admin", department: "Law Enforcement", status: "Active" },
  { name: "Sgt. Morrow", role: "Moderator", department: "Communications", status: "Active" },
  { name: "Officer Lane", role: "Moderator", department: "Training", status: "Active" },
];

const invites = [
  { target: "Deputy Nova", sent: "Today", expires: "6 days" },
  { target: "Dispatcher Vale", sent: "Yesterday", expires: "5 days" },
];

export default function TeamPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="kicker">Team</span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Workspace Members</h1>
        </div>
        <button className="button-primary px-4 py-2 text-sm">Invite member</button>
      </div>

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">Active members</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-[var(--ink-soft)]">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Department</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.name} className="border-t border-[var(--line)]">
                  <td className="py-2 pr-4">{member.name}</td>
                  <td className="py-2 pr-4">{member.role}</td>
                  <td className="py-2 pr-4">{member.department}</td>
                  <td className="py-2">{member.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] p-4">
        <h2 className="text-lg font-semibold tracking-tight">Pending invites</h2>
        <div className="mt-3 space-y-2 text-sm">
          {invites.map((invite) => (
            <div key={invite.target} className="rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
              <p className="font-semibold">{invite.target}</p>
              <p className="text-[var(--ink-soft)]">Sent: {invite.sent}</p>
              <p className="text-xs text-[var(--ink-soft)]">Expires in {invite.expires}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
