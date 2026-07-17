import { CalendarDays } from 'lucide-react';
import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { BrandMark } from '@/components/ui/brand-mark';
import {
  calculateAgeFromBirthDate,
  isBirthDateInFuture,
  MIN_ONBOARDING_AGE,
  parseIsoDateLocal,
  toIsoDateLocal,
} from '@/features/onboarding/calculate-age-from-birth-date';
import { saveProfileEmail } from '@/features/onboarding/profile-email-api';
import { useCurrentUser } from '@/stores/current-user';

import '@/features/onboarding/onboarding.css';

type FieldErrors = {
  displayName?: string;
  birthDate?: string;
  email?: string;
  form?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CreateProfileScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setUser = useCurrentUser((state) => state.setUser);

  const nameId = useId();
  const birthDateId = useId();
  const emailId = useId();

  const [displayName, setDisplayName] = useState('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [isBirthDateFocused, setIsBirthDateFocused] = useState(false);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { maxBirthDate, minBirthDate } = useMemo(() => {
    const today = new Date();
    const oldest = new Date(today);
    oldest.setFullYear(today.getFullYear() - 120);

    return {
      maxBirthDate: toIsoDateLocal(today),
      minBirthDate: toIsoDateLocal(oldest),
    };
  }, []);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      next.displayName = t('onboarding.errors.nameRequired');
    }

    if (!birthDateInput.trim()) {
      next.birthDate = t('onboarding.errors.birthDateRequired');
    } else if (!parseIsoDateLocal(birthDateInput)) {
      next.birthDate = t('onboarding.errors.birthDateInvalid');
    } else if (isBirthDateInFuture(birthDateInput)) {
      next.birthDate = t('onboarding.errors.birthDateFuture');
    } else {
      const age = calculateAgeFromBirthDate(birthDateInput);
      if (age == null || age < MIN_ONBOARDING_AGE) {
        next.birthDate = t('onboarding.errors.birthDateMinAge', { min: MIN_ONBOARDING_AGE });
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
    const age = calculateAgeFromBirthDate(birthDateInput);
    const trimmedEmail = email.trim().toLowerCase();

    if (age == null) {
      return;
    }

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
        dateOfBirth: birthDateInput,
        age,
        email: trimmedEmail,
      });

      navigate('/welcome');
    } catch {
      setErrors({ form: t('onboarding.errors.saveFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'w-full rounded-xl border border-line bg-white px-4 py-3 font-body text-base text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-blue-accent focus-visible:ring-2 focus-visible:ring-blue-soft';

  return (
    <div className="min-h-dvh bg-bg font-body text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-6 py-10">
        <BrandMark className="mb-12" />

        <header className="mb-10">
          <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)] font-semibold leading-tight tracking-tight text-ink">
            {t('onboarding.title')}
          </h1>
          <p className="mt-4 font-body text-base leading-relaxed text-ink-2">
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
            <label htmlFor={birthDateId} className="block font-body text-sm font-medium text-ink">
              {t('onboarding.birthDateLabel')}
            </label>
            <div
              className={[
                'onboarding-date-field',
                birthDateInput
                  ? 'onboarding-date-field--filled'
                  : isBirthDateFocused
                    ? 'onboarding-date-field--focused'
                    : 'onboarding-date-field--empty',
                errors.birthDate ? 'onboarding-date-field--invalid' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                id={birthDateId}
                type="date"
                value={birthDateInput}
                min={minBirthDate}
                max={maxBirthDate}
                onFocus={() => {
                  setIsBirthDateFocused(true);
                }}
                onBlur={() => {
                  setIsBirthDateFocused(false);
                }}
                onChange={(event) => {
                  setBirthDateInput(event.target.value);
                  if (errors.birthDate) {
                    setErrors((prev) => ({ ...prev, birthDate: undefined }));
                  }
                }}
                className="onboarding-date-field__input"
                aria-invalid={Boolean(errors.birthDate)}
                aria-describedby={errors.birthDate ? `${birthDateId}-error` : undefined}
              />
              {!birthDateInput && !isBirthDateFocused ? (
                <span className="onboarding-date-field__hint" aria-hidden>
                  {t('onboarding.birthDatePlaceholder')}
                </span>
              ) : null}
              <CalendarDays className="onboarding-date-field__icon" aria-hidden />
            </div>
            {errors.birthDate ? (
              <p id={`${birthDateId}-error`} className="text-sm text-destructive" role="alert">
                {errors.birthDate}
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
