type RoutePlaceholderProps = {
  title: string;
  description: string;
};

export function RoutePlaceholder({ title, description }: RoutePlaceholderProps) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col px-6 py-10">
      <section className="glass-card p-6 sm:p-8">
        <span className="kicker">Module</span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-base text-[var(--ink-soft)]">
          {description}
        </p>
      </section>
    </main>
  );
}
