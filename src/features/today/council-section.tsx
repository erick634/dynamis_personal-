import { useTranslation } from 'react-i18next';

import { CouncilAgentCard } from '@/features/today/council-agent-card';
import type { CouncilAgent } from '@/types/council';

type CouncilSectionProps = {
  agents: CouncilAgent[];
};

export function CouncilSection({ agents }: CouncilSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-ink">{t('today.council.title')}</h2>
      <p className="mt-1 font-body text-sm text-ink-2">{t('today.council.subtitle')}</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {agents.map((agent) => (
          <CouncilAgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
