import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { BrandMark } from '@/components/ui/brand-mark';
import { lookupProfileByEmail } from '@/features/onboarding/profile-email-api';
import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';
import { useCurrentUser } from '@/stores/current-user';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const { t } = useTranslation();
  const hyperspaceNavigate = useHyperspaceNavigate();
  const setUser = useCurrentUser((state) => state.setUser);

  const emailId = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError(t('login.errors.emailRequired'));
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError(t('login.errors.emailInvalid'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const profile = await lookupProfileByEmail(trimmed);
      if (!profile) {
        setError(t('login.errors.notFound'));
        return;
      }

      setUser({
        userId: profile.userId,
        displayName: profile.displayName ?? trimmed.split('@')[0] ?? t('login.fallbackName'),
        email: profile.email,
      });
      hyperspaceNavigate('/guide');
    } catch {
      setError(t('login.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'w-full rounded-xl border border-line bg-white px-4 py-3 font-body text-base text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-blue-accent focus-visible:ring-2 focus-visible:ring-blue-soft';

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-bg font-body text-ink">
      <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-[480px] flex-col px-4 py-8 sm:px-6 sm:py-10">
        <BrandMark className="mb-10 sm:mb-12" />

        <header className="mb-8 sm:mb-10">
          <h1 className="font-display text-[clamp(1.75rem,6vw,2.75rem)] font-semibold leading-tight tracking-tight break-words text-ink">
            {t('login.title')}
          </h1>
          <p className="mt-4 font-body text-base leading-relaxed break-words text-ink-2">
            {t('login.subtitle')}
          </p>
        </header>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex flex-1 flex-col gap-8"
          noValidate
        >
          <div className="space-y-2">
            <label htmlFor={emailId} className="block font-body text-sm font-medium text-ink">
              {t('login.emailLabel')}
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              placeholder={t('login.emailPlaceholder')}
              autoComplete="email"
              required
              disabled={isSubmitting}
              className={inputClassName}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${emailId}-error` : undefined}
            />
            {error ? (
              <p id={`${emailId}-error`} className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-8 py-4 font-body text-base font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </button>

          <div className="border-t border-line-soft pt-6 text-center">
            <p className="font-body text-sm text-ink-2">{t('login.createPrompt')}</p>
            <Link
              to="/onboarding"
              className="mt-3 inline-flex items-center justify-center rounded-full border border-line px-6 py-3 font-body text-sm font-semibold text-ink transition-colors hover:border-blue/40 hover:text-blue"
            >
              {t('login.createProfile')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
