import { AudioLines, Mic, Send } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type DiscoveryInputProps = {
  isVoiceActive: boolean;
  isDisabled?: boolean;
  partialTranscript?: string;
  voiceError?: string | null;
  onSendMessage: (text: string) => void;
  /** Inline dictation into the text field (mic). */
  onStartVoice: () => void;
  onStopVoice: () => void;
  /** Opens the immersive live conversation stage (Speak). */
  onStartLive: () => void;
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
  onStartLive,
}: DiscoveryInputProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [draft, setDraft] = useState('');

  const displayValue = isVoiceActive && partialTranscript ? partialTranscript : draft;
  const voiceErrorMessage = resolveVoiceErrorMessage(voiceError, t);
  const canSend = displayValue.trim().length > 0 && !isDisabled;

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

  const handleLiveClick = () => {
    if (isDisabled) {
      return;
    }
    onStartLive();
  };

  return (
    <div className="px-1 pb-1">
      {isVoiceActive ? (
        <p className="mb-2 px-3 font-body text-xs text-white/80" role="status">
          {t('discovery.voice.listening')}
        </p>
      ) : null}
      {voiceErrorMessage ? (
        <p className="mb-2 px-3 font-body text-xs text-red-warm" role="alert">
          {voiceErrorMessage}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className={[
          'flex items-center gap-2 rounded-[1.75rem] border border-white/40 bg-white px-3 py-2.5 shadow-card',
          'sm:gap-3 sm:px-4 sm:py-3',
          isVoiceActive ? 'ring-2 ring-blue-soft' : '',
        ].join(' ')}
      >
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
          className="min-w-0 flex-1 bg-transparent px-1 py-2 font-body text-base text-ink outline-none placeholder:text-ink-3 disabled:opacity-60 sm:text-sm"
          autoComplete="off"
        />
        {canSend ? (
          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue text-white transition-transform hover:scale-[1.03] active:scale-[0.98]"
            aria-label={t('discovery.input.sendLabel')}
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isDisabled}
              aria-label={
                isVoiceActive ? t('discovery.input.micStopLabel') : t('discovery.input.micLabel')
              }
              aria-pressed={isVoiceActive}
              className={[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-bg-soft hover:text-ink',
                isVoiceActive ? 'bg-blue-soft text-blue' : '',
                isDisabled ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              <Mic className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleLiveClick}
              disabled={isDisabled}
              aria-label={t('discovery.input.speakLabel')}
              className={[
                'flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink px-3.5 text-white transition-transform',
                'hover:scale-[1.02] active:scale-[0.98]',
                isDisabled ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              <AudioLines className="h-4 w-4" aria-hidden />
              <span className="hidden font-body text-sm font-medium sm:inline">
                {t('discovery.input.speak')}
              </span>
            </button>
          </>
        )}
      </form>
    </div>
  );
}
