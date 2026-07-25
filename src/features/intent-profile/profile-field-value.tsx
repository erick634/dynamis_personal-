import { useTranslation } from 'react-i18next';

import { hasProfileFieldContent } from '@/features/intent-profile/has-profile-field-content';

type ProfileFieldValueProps = {
  value: string | null | undefined;
  onContinue: () => void;
};

export function ProfileFieldValue({ value, onContinue }: ProfileFieldValueProps) {
  const { t } = useTranslation();

  if (hasProfileFieldContent(value)) {
    return (
      <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink-2">
        {value}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onContinue}
      className="mt-3 w-full rounded-xl border border-dashed border-line bg-bg-soft/60 px-4 py-3 text-left transition-colors hover:border-blue/40 hover:bg-blue-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-accent"
    >
      <span className="block font-body text-sm leading-relaxed text-ink-2">
        {t('you.stillWorking.message')}
      </span>
      <span className="mt-1.5 block font-body text-sm font-semibold text-blue">
        {t('you.stillWorking.cta')}
      </span>
    </button>
  );
}
