import {
  calculateAgeFromBirthYear,
  isValidBirthYear,
  MIN_ONBOARDING_AGE,
} from '@/features/onboarding/calculate-age-from-birth-date';

export const IDENTITY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type IdentityFieldValues = {
  displayName: string;
  birthYearInput: string;
  email: string;
};

export type IdentityFieldErrors = {
  displayName?: string;
  birthYear?: string;
  email?: string;
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function validateIdentityFields(
  values: IdentityFieldValues,
  t: Translate,
): IdentityFieldErrors {
  const next: IdentityFieldErrors = {};
  const trimmedName = values.displayName.trim();

  if (!trimmedName) {
    next.displayName = t('onboarding.errors.nameRequired');
  }

  if (!values.birthYearInput.trim()) {
    next.birthYear = t('onboarding.errors.birthYearInvalid');
  } else {
    const year = Number.parseInt(values.birthYearInput.trim(), 10);
    if (!/^\d{4}$/.test(values.birthYearInput.trim()) || !isValidBirthYear(year)) {
      next.birthYear = t('onboarding.errors.birthYearInvalid');
    } else {
      const age = calculateAgeFromBirthYear(year);
      if (age < MIN_ONBOARDING_AGE) {
        next.birthYear = t('onboarding.errors.birthYearMinAge', { min: MIN_ONBOARDING_AGE });
      }
    }
  }

  const trimmedEmail = values.email.trim();
  if (!trimmedEmail) {
    next.email = t('onboarding.errors.emailRequired');
  } else if (!IDENTITY_EMAIL_RE.test(trimmedEmail)) {
    next.email = t('onboarding.errors.emailInvalid');
  }

  return next;
}

export function resolveIdentitySubmitValues(values: IdentityFieldValues): {
  displayName: string;
  birthYear: number;
  age: number;
  email: string;
} {
  const birthYear = Number.parseInt(values.birthYearInput.trim(), 10);
  return {
    displayName: values.displayName.trim(),
    birthYear,
    age: calculateAgeFromBirthYear(birthYear),
    email: values.email.trim().toLowerCase(),
  };
}
