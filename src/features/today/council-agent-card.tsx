import { useTranslation } from 'react-i18next';

import type { CouncilAgentId } from '@/lib/livekit';
import type { CouncilAgent } from '@/types/council';

const AGENT_GRADIENTS: Record<CouncilAgentId, string> = {
  dynamis: 'from-blue to-blue-accent',
  health: 'from-red-warm to-red',
  navigator: 'from-[#3d3568] to-[#5c4fa8]',
  purpose: 'from-success-deep to-success',
};

const AGENT_INITIALS: Record<CouncilAgentId, string> = {
  dynamis: 'D',
  health: 'H',
  navigator: 'N',
  purpose: 'P',
};

type CouncilAgentCardProps = {
  agent: CouncilAgent;
};

export function CouncilAgentCard({ agent }: CouncilAgentCardProps) {
  const { t } = useTranslation();
  const nameKey = `council.agents.${agent.id}.name`;
  const roleKey = `council.agents.${agent.id}.role`;
  const statusKey = `council.agents.${agent.id}.status`;

  const pillKey = agent.status === 'aligned' ? 'council.pills.aligned' : 'council.pills.suggested';

  const pillClass =
    agent.status === 'aligned' ? 'bg-blue-accent text-white' : 'bg-success/15 text-success-deep';

  return (
    <article className="relative flex flex-col rounded-[20px] border border-line-soft bg-white p-5 shadow-card">
      <span
        className={[
          'absolute top-4 right-4 rounded-full px-2.5 py-0.5 font-body text-[10px] font-bold tracking-wide uppercase',
          pillClass,
        ].join(' ')}
      >
        {t(pillKey)}
      </span>

      <div
        className={[
          'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-lg font-bold text-white',
          AGENT_GRADIENTS[agent.id],
        ].join(' ')}
        aria-hidden
      >
        {AGENT_INITIALS[agent.id]}
      </div>

      <h3 className="mt-4 pr-16 font-display text-lg font-semibold text-ink">{t(nameKey)}</h3>
      <p className="font-body text-xs font-medium text-ink-3">{t(roleKey)}</p>
      <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-ink-2">{t(statusKey)}</p>
    </article>
  );
}
