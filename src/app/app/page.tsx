const cards = [
  "Server status and live activity",
  "Recent moderation and command events",
  "Session performance summary",
  "Pending infractions and appeal queue",
];

export default function AppOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard Overview</h1>
      <p className="mt-2 text-sm text-black/70">
        Primary workspace summary for ER:LC operations.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <article
            key={card}
            className="rounded-md border border-black/10 bg-[#fafaf7] p-4 text-sm"
          >
            {card}
          </article>
        ))}
      </div>
    </div>
  );
}
