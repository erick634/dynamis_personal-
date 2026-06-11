type TodayGreetingProps = {
  initial: string;
  title: string;
  subtitle: string;
};

export function TodayGreeting({ initial, title, subtitle }: TodayGreetingProps) {
  return (
    <header className="flex items-center gap-3">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-soft to-blue-mist font-display text-lg font-semibold text-blue-2"
        aria-hidden
      >
        {initial}
      </div>
      <div className="min-w-0">
        <h1 className="font-display text-[19px] font-semibold leading-snug text-ink">{title}</h1>
        <p className="mt-0.5 font-body text-xs text-ink-3">{subtitle}</p>
      </div>
    </header>
  );
}
