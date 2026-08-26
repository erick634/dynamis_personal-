import { Smile } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { LifeAreaShareComment } from '@/features/share/life-area-share-types';

const COMMENT_EMOJIS = [
  '😀',
  '😂',
  '🤣',
  '😊',
  '😍',
  '🥰',
  '😎',
  '🤔',
  '🙌',
  '👏',
  '🔥',
  '✨',
  '💪',
  '❤️',
  '💜',
  '💙',
  '👍',
  '👎',
  '🎉',
  '🌟',
  '🚀',
  '🎯',
  '📚',
  '💡',
  '🌈',
  '☕',
  '🏆',
  '🌱',
  '📌',
  '💬',
] as const;

type ShareCommentFormProps = {
  onSubmit: (input: { authorName: string; body: string }) => Promise<void>;
  submitLabel: string;
};

export function ShareCommentForm({ onSubmit, submitLabel }: ShareCommentFormProps) {
  const { t } = useTranslation();
  const [authorName, setAuthorName] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEmojiOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (emojiPanelRef.current?.contains(target)) return;
      setIsEmojiOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isEmojiOpen]);

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((prev) => `${prev}${emoji}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${body.slice(0, start)}${emoji}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + emoji.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({ authorName: authorName.trim(), body: body.trim() });
      setBody('');
      setIsEmojiOpen(false);
    } catch {
      setError(t('share.lifeArea.comments.error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2">
      <input
        value={authorName}
        onChange={(event) => {
          setAuthorName(event.target.value);
        }}
        placeholder={t('share.lifeArea.comments.namePlaceholder')}
        maxLength={60}
        required
        className="w-full rounded-xl border border-line bg-white px-3 py-2 font-body text-sm text-ink outline-none focus:border-blue/50"
      />
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
          }}
          placeholder={t('share.lifeArea.comments.bodyPlaceholder')}
          maxLength={1000}
          rows={3}
          required
          className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2 pr-11 font-body text-sm text-ink outline-none focus:border-blue/50"
        />
        <button
          type="button"
          onClick={() => {
            setIsEmojiOpen((prev) => !prev);
          }}
          className="absolute top-2 right-2 rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-bg-deep-cream hover:text-ink"
          aria-label={t('share.lifeArea.comments.emojiPicker')}
          aria-expanded={isEmojiOpen}
          title={t('share.lifeArea.comments.emojiPicker')}
        >
          <Smile className="size-4" aria-hidden />
        </button>
        {isEmojiOpen ? (
          <div
            ref={emojiPanelRef}
            className="absolute right-0 bottom-full z-10 mb-2 w-[15.5rem] rounded-xl border border-line-soft bg-white p-2 shadow-soft"
            role="listbox"
            aria-label={t('share.lifeArea.comments.emojiPicker')}
          >
            <div className="grid grid-cols-6 gap-1">
              {COMMENT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    insertEmoji(emoji);
                  }}
                  className="rounded-lg p-1.5 text-lg leading-none transition-colors hover:bg-bg-deep-cream"
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-blue px-4 py-2 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? t('share.lifeArea.comments.sending') : submitLabel}
        </button>
        {error ? (
          <p className="font-body text-xs text-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

type ShareCommentListProps = {
  comments: LifeAreaShareComment[];
  emptyLabel: string;
  showTarget?: boolean;
};

export function ShareCommentList({
  comments,
  emptyLabel,
  showTarget = false,
}: ShareCommentListProps) {
  const { t, i18n } = useTranslation();

  if (comments.length === 0) {
    return <p className="font-body text-sm text-ink-3">{emptyLabel}</p>;
  }

  const formatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-xl border border-line-soft/80 bg-bg/50 px-3.5 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-body text-sm font-semibold text-ink">{comment.author_name}</p>
            <time dateTime={comment.created_at} className="font-body text-[11px] text-ink-3">
              {formatter.format(new Date(comment.created_at))}
            </time>
          </div>
          {showTarget && comment.target_type !== 'profile' ? (
            <p className="mt-1 font-body text-[11px] text-ink-3">
              {t(`share.lifeArea.comments.target.${comment.target_type}`, {
                label: comment.target_label ?? '',
              })}
            </p>
          ) : null}
          <p className="mt-1.5 whitespace-pre-wrap font-body text-sm leading-relaxed text-ink-2">
            {comment.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
