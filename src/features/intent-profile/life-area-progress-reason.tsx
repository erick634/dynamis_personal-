import { ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

const inputClass =
  'rounded-xl border border-line bg-white px-3 py-2 font-body text-sm outline-none focus:border-blue/50';

type ProgressReasonInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function ProgressReasonInput({ value, onChange }: ProgressReasonInputProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const id = useId();
  const panelId = `${id}-panel`;

  return (
    <div className="rounded-xl border border-line-soft/80 bg-white/70">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left"
      >
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-ink-3" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-ink-3" aria-hidden />
        )}
        <span className="font-body text-[11px] font-semibold tracking-wide text-ink-3 uppercase">
          {t('you.lifeArea.assets.progressReasonLabel')}
        </span>
        {!isOpen && value.trim() ? (
          <span className="ml-auto truncate font-body text-[11px] text-ink-2 italic">
            {value.trim()}
          </span>
        ) : null}
      </button>
      {isOpen ? (
        <div id={panelId} className="border-t border-line-soft/80 px-2.5 pt-2 pb-2.5">
          <label className="block" htmlFor={id}>
            <span className="sr-only">{t('you.lifeArea.assets.progressReasonLabel')}</span>
            <textarea
              id={id}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
              }}
              rows={2}
              placeholder={t('you.lifeArea.assets.progressReasonPlaceholder')}
              className={`${inputClass} w-full resize-y`}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

type ProgressReasonEditorProps = {
  value: string;
  onCommit: (reason: string) => void;
};

export function ProgressReasonEditor({ value, onCommit }: ProgressReasonEditorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const id = useId();
  const panelId = `${id}-panel`;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="mt-2 rounded-xl border border-line-soft/80 bg-bg/40">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left"
      >
        {isOpen ? (
          <ChevronDown className="size-3.5 shrink-0 text-ink-3" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-ink-3" aria-hidden />
        )}
        <span className="font-body text-[11px] font-medium text-ink-3">
          {t('you.lifeArea.assets.progressReasonLabel')}
        </span>
        {!isOpen && value.trim() ? (
          <span className="ml-auto truncate font-body text-[11px] text-ink-2 italic">
            {value.trim()}
          </span>
        ) : null}
      </button>
      {isOpen ? (
        <div id={panelId} className="border-t border-line-soft/80 px-2.5 pt-2 pb-2.5">
          <label className="block" htmlFor={id}>
            <span className="sr-only">{t('you.lifeArea.assets.progressReasonLabel')}</span>
            <textarea
              id={id}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              onBlur={() => {
                const next = draft.trim();
                if (next === value.trim()) return;
                onCommit(next);
              }}
              rows={2}
              placeholder={t('you.lifeArea.assets.progressReasonPlaceholder')}
              className={`${inputClass} w-full resize-y text-xs`}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
