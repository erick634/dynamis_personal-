import { Mic, Send } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type DiscoveryInputProps = {
  isVoiceActive: boolean;
  isDisabled?: boolean;
  partialTranscript?: string;
  voiceError?: string | null;
  onSendMessage: (text: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
};

function resolveVoiceErrorMessage(
  code: string | null | undefined,
  t: (key: string) => string,
): string | null {
  if (!code) {
    return null;
  }
  if (code === 'micDenied') {
    return t('discovery.voice.errorMicDenied');
  }
  if (code === 'noToken') {
    return t('discovery.voice.errorNoToken');
  }
  return code;
}

export function DiscoveryInput({
  isVoiceActive,
  isDisabled = false,
  partialTranscript = '',
  voiceError = null,
  onSendMessage,
  onStartVoice,
  onStopVoice,
}: DiscoveryInputProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [draft, setDraft] = useState('');

  const displayValue = isVoiceActive && partialTranscript ? partialTranscript : draft;
  const voiceErrorMessage = resolveVoiceErrorMessage(voiceError, t);

  useEffect(() => {
    if (!isVoiceActive && partialTranscript) {
      setDraft(partialTranscript);
    }
  }, [isVoiceActive, partialTranscript]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = displayValue.trim();
    if (!trimmed || isDisabled) {
      return;
    }
    if (isVoiceActive) {
      onStopVoice();
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
    <div className="border-t border-line-soft bg-white">
      {isVoiceActive ? (
        <p className="px-4 pt-3 font-body text-xs text-blue md:px-6" role="status">
          {t('discovery.voice.listening')}
        </p>
      ) : null}
      {voiceErrorMessage ? (
        <p className="px-4 pt-2 font-body text-xs text-red md:px-6" role="alert">
          {voiceErrorMessage}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="flex items-center gap-3 px-4 py-4 md:px-6">
        <label htmlFor={inputId} className="sr-only">
          {t('discovery.input.label')}
        </label>
        <input
          id={inputId}
          type="text"
          value={displayValue}
          onChange={(event) => {
            if (!isVoiceActive) {
              setDraft(event.target.value);
            }
          }}
          readOnly={isVoiceActive}
          disabled={isDisabled}
          placeholder={
            isVoiceActive ? t('discovery.voice.placeholder') : t('discovery.input.placeholder')
          }
          className={[
            'min-w-0 flex-1 rounded-full border border-line bg-bg px-4 py-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-blue-accent focus-visible:ring-2 focus-visible:ring-blue-soft',
            isVoiceActive ? 'border-blue-accent/40 bg-blue-soft/30' : '',
          ].join(' ')}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isDisabled || displayValue.trim().length === 0}
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
    </div>
  );
}
