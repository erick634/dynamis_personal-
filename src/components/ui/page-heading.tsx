import type { ReactNode } from 'react';

type PageHeadingProps = {
  title: string;
  children?: ReactNode;
};

export function PageHeading({ title, children }: PageHeadingProps) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
      {children ? <div className="mt-2 text-ink-2">{children}</div> : null}
    </header>
  );
}
