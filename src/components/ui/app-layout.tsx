import { CalendarDays, Compass, ListTodo, Radar, Radio, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/today', labelKey: 'nav.today', icon: CalendarDays },
  { to: '/plan', labelKey: 'nav.plan', icon: ListTodo },
  { to: '/map', labelKey: 'nav.explore', icon: Compass },
  { to: '/watchtowers', labelKey: 'nav.watchtowers', icon: Radar },
  { to: '/live', labelKey: 'nav.live', icon: Radio },
  { to: '/you', labelKey: 'nav.profile', icon: UserRound },
];

export function AppLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-bg font-body text-ink md:pl-56">
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line-soft bg-white/95 px-2 py-2 backdrop-blur md:inset-y-0 md:right-auto md:w-56 md:flex-col md:border-t-0 md:border-r md:px-4 md:py-6"
        aria-label={t('appLayout.navLabel')}
      >
        <p className="mb-4 hidden font-display text-lg font-semibold text-blue md:block">
          {t('brand.name')}
        </p>
        <ul className="flex items-stretch justify-around gap-1 md:flex-col md:justify-start md:gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1 md:flex-none">
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex flex-col items-center gap-1 rounded-xl px-2 py-2 font-body text-[11px] font-medium transition-colors md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-sm',
                      isActive ? 'text-blue' : 'text-ink-3 hover:text-ink',
                    ].join(' ')
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="min-h-dvh pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
