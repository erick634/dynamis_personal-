export const MIN_ONBOARDING_AGE = 13;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export function toIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(year)}-${month}-${day}`;
}

export function parseIsoDateLocal(iso: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return null;
  }

  const yearText = match[1];
  const monthText = match[2];
  const dayText = match[3];
  if (!yearText || !monthText || !dayText) {
    return null;
  }

  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return { year, month, day };
}

export function isBirthDateInFuture(birthDateIso: string, referenceDate = new Date()): boolean {
  const parts = parseIsoDateLocal(birthDateIso);
  if (!parts) {
    return false;
  }

  const birth = new Date(parts.year, parts.month - 1, parts.day);
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );

  return birth.getTime() > today.getTime();
}

export function calculateAgeFromBirthDate(
  birthDateIso: string,
  referenceDate = new Date(),
): number | null {
  const parts = parseIsoDateLocal(birthDateIso);
  if (!parts) {
    return null;
  }

  let age = referenceDate.getFullYear() - parts.year;
  const monthDiff = referenceDate.getMonth() - (parts.month - 1);

  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < parts.day)) {
    age -= 1;
  }

  return age;
}
