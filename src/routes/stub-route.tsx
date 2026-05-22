import { useTranslation } from 'react-i18next';

import { PageHeading } from '@/components/ui/page-heading';

type StubRouteProps = {
  titleKey: string;
};

export function StubRoute({ titleKey }: StubRouteProps) {
  const { t } = useTranslation();

  return (
    <section className="rounded-[20px] border border-line-soft bg-white p-8 shadow-card">
      <PageHeading title={t(titleKey)}>
        <p className="text-ink-2">{t('routes.stubMessage')}</p>
      </PageHeading>
    </section>
  );
}
