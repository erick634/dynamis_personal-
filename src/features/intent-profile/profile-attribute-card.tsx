type ProfileAttributeCardProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function ProfileAttributeCard({ eyebrow, title, description }: ProfileAttributeCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[20px] border border-line-soft bg-white p-6 shadow-card">
      <div
        className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-blue to-red"
        aria-hidden
      />
      <p className="font-body text-[11px] font-semibold tracking-[0.14em] text-blue uppercase">
        {eyebrow}
      </p>
      <h3 className="mt-3 font-display text-2xl font-semibold leading-snug text-ink">{title}</h3>
      {description ? (
        <p className="mt-2 font-body text-sm leading-relaxed text-ink-2">{description}</p>
      ) : null}
    </article>
  );
}
