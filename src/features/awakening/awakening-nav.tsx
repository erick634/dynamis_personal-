import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/brand-mark';

const NAV_LINKS = [
  { href: '#benefits', labelKey: 'awakening.nav.about' },
  { href: '#benefits', labelKey: 'awakening.nav.pricing' },
  { href: '#benefits', labelKey: 'awakening.nav.contact' },
] as const;

export function AwakeningNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className="awakening__nav absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10 lg:px-12">
        <BrandMark variant="on-dark" />

        <nav className="flex items-center gap-1 sm:gap-2" aria-label={t('awakening.nav.ariaLabel')}>
          <ul className="mr-2 hidden items-center gap-1 md:flex lg:mr-4 lg:gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.labelKey}>
                <a
                  href={link.href}
                  className="rounded-xl px-3 py-2 font-body text-sm text-white/75 transition-colors duration-200 hover:bg-white/5 hover:text-white lg:px-4"
                >
                  {t(link.labelKey)}
                </a>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              navigate('/login');
            }}
            className="rounded-2xl border border-white/80 px-4 py-2 font-body text-sm font-medium text-white transition-[background-color,border-color,box-shadow] duration-200 hover:border-white hover:bg-white/5 hover:shadow-[0_0_24px_rgb(255_255_255_/_8%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5468FF]"
          >
            {t('awakening.nav.signIn')}
          </button>
        </nav>
      </div>
    </header>
  );
}
