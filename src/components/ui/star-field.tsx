import '@/components/ui/star-field.css';

type StarFieldProps = {
  className?: string;
  variant?: 'idle' | 'warp';
};

export function StarField({ className, variant = 'idle' }: StarFieldProps) {
  return (
    <div
      className={['star-field', variant === 'warp' ? 'star-field--warp' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <div className="star-field__layer star-field__layer--far" />
      <div className="star-field__layer star-field__layer--near" />
      {variant === 'warp' ? <div className="star-field__streaks" /> : null}
    </div>
  );
}
