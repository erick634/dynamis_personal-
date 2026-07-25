import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { saveProfileEmail } from '@/features/onboarding/profile-email-api';
import {
  resolveIdentitySubmitValues,
  validateIdentityFields,
  type IdentityFieldErrors,
} from '@/features/onboarding/validate-identity-fields';
import { useCurrentUser, type CurrentUser } from '@/stores/current-user';

type DiscoveryIdentityCardProps = {
  /** Called after identity is saved so Discovery can continue (e.g. flush pending message). */
  onCompleted: (user: CurrentUser) => void;
};

export function DiscoveryIdentityCard({ onCompleted }: DiscoveryIdentityCardProps) {
  const { t } = useTranslation();
  const setUser = useCurrentUser((state) => state.setUser);
  const nameId = useId();
  const birthYearId = useId();
  const emailId = useId();

  const [displayName, setDisplayName] = useState('');
  const [birthYearInput, setBirthYearInput] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<IdentityFieldErrors & { form?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { maxBirthYear, minBirthYear } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return {
      maxBirthYear: currentYear,
      minBirthYear: currentYear - 120,
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = { displayName, birthYearInput, email };
    const nextErrors = validateIdentityFields(values, t);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const resolved = resolveIdentitySubmitValues(values);
    const userId = crypto.randomUUID();
    setIsSubmitting(true);

    try {
      await saveProfileEmail({
        userId,
        email: resolved.email,
        displayName: resolved.displayName,
      });

      const user: CurrentUser = {
        userId,
        displayName: resolved.displayName,
        birthYear: resolved.birthYear,
        age: resolved.age,
        email: resolved.email,
      };
      setUser(user);
      onCompleted(user);
    } catch {
      setErrors({ form: t('onboarding.errors.saveFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClassName =
    'w-full rounded-xl border border-line bg-white px-3 py-2.5 font-body text-base text-ink outline-none transition-colors placeholder:text-ink-3 focus-visible:border-blue-accent focus-visible:ring-2 focus-visible:ring-blue-soft sm:text-sm';

  return (
    <div className="mx-auto w-full max-w-md rounded-[20px] border border-white/25 bg-white/95 p-4 shadow-card backdrop-blur-sm sm:p-5">
      <p className="font-display text-lg font-semibold text-ink">{t('discovery.identity.title')}</p>
      <p className="mt-1 font-body text-sm text-ink-2">{t('discovery.identity.subtitle')}</p>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="mt-4 flex flex-col gap-3"
        noValidate
      >
        <div>
          <label htmlFor={nameId} className="mb-1 block font-body text-xs font-medium text-ink-2">
            {t('onboarding.nameLabel')}
          </label>
          <input
            id={nameId}
            type="text"
            autoComplete="given-name"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
            }}
            placeholder={t('onboarding.namePlaceholder')}
            className={fieldClassName}
            disabled={isSubmitting}
          />
          {errors.displayName ? (
            <p className="mt-1 font-body text-xs text-red-deep" role="alert">
              {errors.displayName}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={emailId} className="mb-1 block font-body text-xs font-medium text-ink-2">
            {t('onboarding.emailLabel')}
          </label>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
            placeholder={t('onboarding.emailPlaceholder')}
            className={fieldClassName}
            disabled={isSubmitting}
          />
          {errors.email ? (
            <p className="mt-1 font-body text-xs text-red-deep" role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor={birthYearId}
            className="mb-1 block font-body text-xs font-medium text-ink-2"
          >
            {t('onboarding.birthYearLabel')}
          </label>
          <input
            id={birthYearId}
            type="number"
            inputMode="numeric"
            min={minBirthYear}
            max={maxBirthYear}
            value={birthYearInput}
            onChange={(event) => {
              setBirthYearInput(event.target.value);
            }}
            placeholder={t('onboarding.birthYearPlaceholder')}
            className={fieldClassName}
            disabled={isSubmitting}
          />
          {errors.birthYear ? (
            <p className="mt-1 font-body text-xs text-red-deep" role="alert">
              {errors.birthYear}
            </p>
          ) : null}
        </div>

        {errors.form ? (
          <p className="font-body text-xs text-red-deep" role="alert">
            {errors.form}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-blue px-4 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-blue-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t('discovery.identity.saving') : t('discovery.identity.submit')}
        </button>
      </form>
    </div>
  );
}
