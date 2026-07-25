import '@/components/ui/star-field.css';

type StarFieldProps = {
  className?: string;
};

export function StarField({ className }: StarFieldProps) {
  return (
    <div className={['star-field', className].filter(Boolean).join(' ')} aria-hidden>
      <div className="star-field__layer star-field__layer--far" />
      <div className="star-field__layer star-field__layer--near" />
    </div>
  );
}
