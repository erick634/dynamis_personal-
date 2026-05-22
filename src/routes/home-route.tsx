import { useTranslation } from 'react-i18next';

import { PageHeading } from '@/components/ui/page-heading';

export function HomeRoute() {
  const { t } = useTranslation();

  return (
    <section className="rounded-[20px] border border-line-soft bg-white p-8 shadow-card">
      <PageHeading title={`${t('bootstrap.title')} — ${t('bootstrap.ok')}`}>
        <p className="text-ink-2">{t('routes.stubMessage')}</p>
      </PageHeading>
    </section>
  );
}
