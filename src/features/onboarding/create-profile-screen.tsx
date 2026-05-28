import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { BrandMark } from '@/components/ui/brand-mark';
import { useCurrentUser } from '@/stores/current-user';

const MIN_AGE = 13;

type FieldErrors = {
  displayName?: string;
  age?: string;
};

export function CreateProfileScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setUser = useCurrentUser((state) => state.setUser);

  const nameId = useId();
  const ageId = useId();
  const emailId = useId();

  const [displayName, setDisplayName] = useState('');
  const [ageInput, setAgeInput] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      next.displayName = t('onboarding.errors.nameRequired');
    }

    const age = Number.parseInt(ageInput, 10);
    if (!ageInput.trim()) {
      next.age = t('onboarding.errors.ageRequired');
    } else if (Number.isNaN(age) || age < MIN_AGE) {
      next.age = t('onboarding.errors.ageMin', { min: MIN_AGE });
    }

    return next;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const trimmedName = displayName.trim();
    const age = Number.parseInt(ageInput, 10);
    const trimmedEmail = email.trim();

    setUser({
      userId: crypto.randomUUID(),
      displayName: trimmedName,
      age,
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
    });

    navigate('/welcome');
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

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-8" noValidate>
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
            <label htmlFor={ageId} className="block font-body text-sm font-medium text-ink">
              {t('onboarding.ageLabel')}
            </label>
            <input
              id={ageId}
              type="number"
              min={MIN_AGE}
              inputMode="numeric"
              value={ageInput}
              onChange={(event) => {
                setAgeInput(event.target.value);
                if (errors.age) {
                  setErrors((prev) => ({ ...prev, age: undefined }));
                }
              }}
              placeholder={t('onboarding.agePlaceholder')}
              className={inputClassName}
              aria-invalid={Boolean(errors.age)}
              aria-describedby={errors.age ? `${ageId}-error` : undefined}
            />
            {errors.age ? (
              <p id={`${ageId}-error`} className="text-sm text-destructive" role="alert">
                {errors.age}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor={emailId} className="block font-body text-sm font-medium text-ink">
              {t('onboarding.emailLabel')}
              <span className="ml-1.5 font-normal text-ink-3">({t('onboarding.emailHint')})</span>
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
              placeholder={t('onboarding.emailPlaceholder')}
              autoComplete="email"
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-red-deep via-red to-red-warm px-8 py-4 font-body text-base font-semibold text-white shadow-glow-red transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent active:scale-[0.98]"
          >
            {t('onboarding.submitButton')}
          </button>
        </form>
      </div>
    </div>
  );
}
