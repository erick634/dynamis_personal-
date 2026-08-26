import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

export function CollapsibleAssetSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <section className="rounded-2xl border border-line-soft/80 bg-bg/40">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className="flex w-full items-center gap-2 px-5 py-4 text-left"
      >
        {isOpen ? (
          <ChevronDown className="size-4 shrink-0 text-ink-3" aria-hidden />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
        )}
        {icon}
        <span className="font-body text-sm font-semibold text-ink">{title}</span>
        {typeof count === 'number' && count > 0 ? (
          <span className="ml-auto rounded-full bg-blue-soft/80 px-2 py-0.5 font-body text-[11px] font-semibold tabular-nums text-blue">
            {count}
          </span>
        ) : null}
      </button>
      {isOpen ? (
        <div id={panelId} className="border-t border-line-soft/80 px-5 pt-3 pb-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}
