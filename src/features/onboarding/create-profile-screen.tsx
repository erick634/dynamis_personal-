import { CalendarDays } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/brand-mark';
import {
  calculateAgeFromBirthYear,
  isValidBirthYear,
  MIN_ONBOARDING_AGE,
} from '@/features/onboarding/calculate-age-from-birth-date';
import { saveProfileEmail } from '@/features/onboarding/profile-email-api';
import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';
import { useCurrentUser } from '@/stores/current-user';

import '@/features/onboarding/onboarding.css';

type FieldErrors = {
  displayName?: string;
  birthYear?: string;
  email?: string;
  form?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateProfileScreen() {
  const { t } = useTranslation();
  const hyperspaceNavigate = useHyperspaceNavigate();
  const setUser = useCurrentUser((state) => state.setUser);

  const nameId = useId();
  const birthYearId = useId();
  const emailId = useId();

  const [displayName, setDisplayName] = useState('');
  const [birthYearInput, setBirthYearInput] = useState('');
  const [isBirthYearFocused, setIsBirthYearFocused] = useState(false);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { maxBirthYear, minBirthYear } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return {
      maxBirthYear: currentYear,
      minBirthYear: currentYear - 120,
    };
  }, []);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      next.displayName = t('onboarding.errors.nameRequired');
    }

    if (!birthYearInput.trim()) {
      next.birthYear = t('onboarding.errors.birthYearInvalid');
    } else {
      const year = Number.parseInt(birthYearInput.trim(), 10);
      if (!/^\d{4}$/.test(birthYearInput.trim()) || !isValidBirthYear(year)) {
        next.birthYear = t('onboarding.errors.birthYearInvalid');
      } else {
        const age = calculateAgeFromBirthYear(year);
        if (age < MIN_ONBOARDING_AGE) {
          next.birthYear = t('onboarding.errors.birthYearMinAge', { min: MIN_ONBOARDING_AGE });
        }
      }
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      next.email = t('onboarding.errors.emailRequired');
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      next.email = t('onboarding.errors.emailInvalid');
    }

    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const trimmedName = displayName.trim();
    const year = Number.parseInt(birthYearInput.trim(), 10);
    const age = calculateAgeFromBirthYear(year);
    const trimmedEmail = email.trim().toLowerCase();

    const userId = crypto.randomUUID();
    setIsSubmitting(true);

    try {
      await saveProfileEmail({
        userId,
        email: trimmedEmail,
        displayName: trimmedName,
      });

      setUser({
        userId,
        displayName: trimmedName,
        birthYear: year,
        age,
        email: trimmedEmail,
      });

      hyperspaceNavigate('/guide');
    } catch {
      setErrors({ form: t('onboarding.errors.saveFailed') });
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
            {t('onboarding.title')}
          </h1>
          <p className="mt-4 font-body text-base leading-relaxed break-words text-ink-2">
            {t('onboarding.subtitle')}
          </p>
        </header>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="flex flex-1 flex-col gap-8"
          noValidate
        >
          <div className="space-y-2">
            <label htmlFor={nameId} className="block font-body text-sm font-medium text-ink">
              {t('onboarding.nameLabel')}
            </label>
            <input
              id={nameId}
              type="text"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                if (errors.displayName) {
                  setErrors((prev) => ({ ...prev, displayName: undefined }));
                }
              }}
              placeholder={t('onboarding.namePlaceholder')}
              autoComplete="name"
              className={inputClassName}
              aria-invalid={Boolean(errors.displayName)}
              aria-describedby={errors.displayName ? `${nameId}-error` : undefined}
            />
            {errors.displayName ? (
              <p id={`${nameId}-error`} className="text-sm text-destructive" role="alert">
                {errors.displayName}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor={birthYearId} className="block font-body text-sm font-medium text-ink">
              {t('onboarding.birthYearLabel')}
            </label>
            <div
              className={[
                'onboarding-date-field',
                birthYearInput
                  ? 'onboarding-date-field--filled'
                  : isBirthYearFocused
                    ? 'onboarding-date-field--focused'
                    : 'onboarding-date-field--empty',
                errors.birthYear ? 'onboarding-date-field--invalid' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                id={birthYearId}
                type="number"
                inputMode="numeric"
                value={birthYearInput}
                min={minBirthYear}
                max={maxBirthYear}
                placeholder={t('onboarding.birthYearPlaceholder')}
                onFocus={() => {
                  setIsBirthYearFocused(true);
                }}
                onBlur={() => {
                  setIsBirthYearFocused(false);
                }}
                onChange={(event) => {
                  setBirthYearInput(event.target.value);
                  if (errors.birthYear) {
                    setErrors((prev) => ({ ...prev, birthYear: undefined }));
                  }
                }}
                className="onboarding-date-field__input"
                aria-invalid={Boolean(errors.birthYear)}
                aria-describedby={errors.birthYear ? `${birthYearId}-error` : undefined}
              />
              <CalendarDays className="onboarding-date-field__icon" aria-hidden />
            </div>
            {errors.birthYear ? (
              <p id={`${birthYearId}-error`} className="text-sm text-destructive" role="alert">
                {errors.birthYear}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor={emailId} className="block font-body text-sm font-medium text-ink">
              {t('onboarding.emailLabel')}
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              placeholder={t('onboarding.emailPlaceholder')}
              autoComplete="email"
              required
              className={inputClassName}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${emailId}-error` : undefined}
            />
            {errors.email ? (
              <p id={`${emailId}-error`} className="text-sm text-destructive" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-8 py-4 font-body text-base font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {t('onboarding.submitButton')}
          </button>
          {errors.form ? (
            <p className="text-center text-sm text-destructive" role="alert">
              {errors.form}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
