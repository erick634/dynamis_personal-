import { Layers, Sparkles, Target, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type ConversationIntent = 'refine' | 'newWatchtower' | 'advance' | 'continueProfile';

type DiscoveryIntentPickerProps = {
  onSelect: (intent: ConversationIntent) => void;
  disabled?: boolean;
};

const INTENTS: {
  id: ConversationIntent;
  icon: typeof Sparkles;
  titleKey: string;
  bodyKey: string;
}[] = [
  {
    id: 'refine',
    icon: Sparkles,
    titleKey: 'discovery.intent.refine.title',
    bodyKey: 'discovery.intent.refine.body',
  },
  {
    id: 'newWatchtower',
    icon: Target,
    titleKey: 'discovery.intent.newWatchtower.title',
    bodyKey: 'discovery.intent.newWatchtower.body',
  },
  {
    id: 'advance',
    icon: Wrench,
    titleKey: 'discovery.intent.advance.title',
    bodyKey: 'discovery.intent.advance.body',
  },
  {
    id: 'continueProfile',
    icon: Layers,
    titleKey: 'discovery.intent.continueProfile.title',
    bodyKey: 'discovery.intent.continueProfile.body',
  },
];

export function DiscoveryIntentPicker({ onSelect, disabled = false }: DiscoveryIntentPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 w-full max-w-md text-left">
      <p className="font-body text-sm font-medium text-white/80">{t('discovery.intent.prompt')}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {INTENTS.map((intent) => {
          const Icon = intent.icon;
          return (
            <li key={intent.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(intent.id);
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-white/80" aria-hidden />
                <span>
                  <span className="block font-body text-sm font-semibold text-white">
                    {t(intent.titleKey)}
                  </span>
                  <span className="mt-0.5 block font-body text-xs leading-relaxed text-white/65">
                    {t(intent.bodyKey)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
