type PublicHeroProps = {
  kicker: string;
  title: string;
  description?: string;
};

export function PublicHero({ kicker, title, description }: PublicHeroProps) {
  return (
    <section className="public-hero">
      <span className="kicker">{kicker}</span>
      <h1 className="public-hero-title mt-4">{title}</h1>
      {description ? (
        <p className="public-hero-description mt-4">{description}</p>
      ) : null}
    </section>
  );
}
