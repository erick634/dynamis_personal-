import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enUS from '@/locales/en-US.json';
import ptBR from '@/locales/pt-BR.json';

export const DEFAULT_LOCALE = 'en-US' as const;

const resources = {
  'en-US': { translation: enUS },
  'pt-BR': { translation: ptBR },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

export { i18n };
