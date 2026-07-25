import { useTranslation } from 'react-i18next';

import type { DiscoveryMessage } from '@/features/discovery/discovery-types';
import { useCurrentUser } from '@/stores/current-user';

type DiscoveryMessageProps = {
  message: DiscoveryMessage;
};

export function DiscoveryMessageBubble({ message }: DiscoveryMessageProps) {
  const { t } = useTranslation();
  const displayName = useCurrentUser((state) => state.user?.displayName);
  const isAgent = message.role === 'agent';
  const body = message.contentKey
    ? t(message.contentKey, {
        name: displayName?.trim() || t('discovery.greetingFallbackName'),
      })
    : (message.text ?? '');

  return (
    <div className={`flex gap-3 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
      <div
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold',
          isAgent ? 'bg-white/15 text-white ring-1 ring-white/25' : 'bg-blue text-white',
        ].join(' ')}
        aria-hidden
      >
        {isAgent ? 'D' : t('discovery.message.userAvatar')}
      </div>
      <div
        className={[
          'max-w-[min(100%,28rem)] rounded-[20px] px-4 py-3 font-body text-sm leading-relaxed shadow-soft',
          isAgent
            ? 'rounded-tl-md bg-white/95 text-ink backdrop-blur-sm'
            : 'rounded-tr-md bg-blue text-white',
        ].join(' ')}
      >
        <p>{body}</p>
      </div>
    </div>
  );
}
