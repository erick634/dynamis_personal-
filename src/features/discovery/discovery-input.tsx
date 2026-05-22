import { Mic, Send } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type DiscoveryInputProps = {
  isVoiceActive: boolean;
  isDisabled?: boolean;
  onSendMessage: (text: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
};

export function DiscoveryInput({
  isVoiceActive,
  isDisabled = false,
  onSendMessage,
  onStartVoice,
  onStopVoice,
}: DiscoveryInputProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [draft, setDraft] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isDisabled) {
      return;
    }
    onSendMessage(trimmed);
    setDraft('');
  };

  const handleMicClick = () => {
    if (isDisabled) {
      return;
    }
    if (isVoiceActive) {
      onStopVoice();
    } else {
      onStartVoice();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 border-t border-line-soft bg-white px-4 py-4 md:px-6"
    >
      <label htmlFor={inputId} className="sr-only">
        {t('discovery.input.label')}
      </label>
      <input
        id={inputId}
        type="text"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        disabled={isDisabled}
        placeholder={t('discovery.input.placeholder')}
        className="min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-blue-accent focus-visible:ring-2 focus-visible:ring-blue-soft"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={isDisabled || draft.trim().length === 0}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-soft text-blue transition-colors hover:bg-blue-soft disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={t('discovery.input.sendLabel')}
      >
        <Send className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={handleMicClick}
        disabled={isDisabled}
        aria-label={
          isVoiceActive ? t('discovery.input.micStopLabel') : t('discovery.input.micLabel')
        }
        aria-pressed={isVoiceActive}
        className={[
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[var(--shadow-soft)] transition-transform',
          'bg-gradient-to-br from-blue to-blue-accent hover:scale-[1.03] active:scale-[0.98]',
          isVoiceActive ? 'ring-2 ring-blue-soft ring-offset-2' : '',
          isDisabled ? 'cursor-not-allowed opacity-40' : '',
        ].join(' ')}
      >
        <Mic className="h-5 w-5" aria-hidden />
      </button>
    </form>
  );
}
