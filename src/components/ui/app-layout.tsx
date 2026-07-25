import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  ListTodo,
  LogOut,
  MessageSquare,
  Radar,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { BrandIcon } from '@/components/ui/brand-icon';
import { useHyperspaceNavigate } from '@/hooks/use-hyperspace-navigate';
import { useCurrentUser } from '@/stores/current-user';

type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** Paths that should also mark this item active (e.g. chat aliases). */
  alsoActiveFor?: readonly string[];
};

const NAV_ITEMS: NavItem[] = [
  { to: '/today', labelKey: 'nav.today', icon: CalendarDays },
  { to: '/plan', labelKey: 'nav.plan', icon: ListTodo },
  { to: '/map', labelKey: 'nav.explore', icon: Compass },
  { to: '/watchtowers', labelKey: 'nav.watchtowers', icon: Radar },
  {
    to: '/guide',
    labelKey: 'nav.chat',
    icon: MessageSquare,
    alsoActiveFor: ['/', '/guide', '/discovery'],
  },
  { to: '/you', labelKey: 'nav.profile', icon: UserRound },
];

export function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const clearUser = useCurrentUser((state) => state.clearUser);
  const hyperspaceNavigate = useHyperspaceNavigate();
  /** Desktop rail defaults to icon-only; labels appear when expanded. */
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const handleLogout = () => {
    clearUser();
    navigate('/login', { replace: true });
  };

  const desktopPad = isSidebarCollapsed ? 'md:pl-16' : 'md:pl-56';
  const desktopWidth = isSidebarCollapsed ? 'md:w-16' : 'md:w-56';

  return (
    <div className={`min-h-dvh overflow-x-hidden bg-bg font-body text-ink ${desktopPad}`}>
      <nav
        className={[
          'fixed inset-x-0 bottom-0 z-50 border-t border-line-soft bg-white/95 backdrop-blur',
          'md:inset-y-0 md:right-auto md:flex md:flex-col md:border-t-0 md:border-r md:py-5',
          'transition-[width,padding] duration-200 ease-out',
          desktopWidth,
          isSidebarCollapsed ? 'md:px-2' : 'md:px-3',
        ].join(' ')}
        aria-label={t('appLayout.navLabel')}
      >
        <div
          className={[
            'mb-4 hidden items-center md:flex',
            isSidebarCollapsed ? 'justify-center' : 'gap-2.5 px-1',
          ].join(' ')}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue text-white"
            aria-hidden
          >
            <BrandIcon className="h-4 w-4" />
          </span>
          {!isSidebarCollapsed ? (
            <span className="font-display text-lg font-semibold tracking-tight text-blue">
              {t('brand.name')}
            </span>
          ) : null}
        </div>

        <div className="flex w-full items-stretch overflow-x-auto overscroll-x-contain px-1 py-2 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-1 md:flex-col md:overflow-visible md:px-0 md:py-0 [&::-webkit-scrollbar]:hidden">
          <ul className="flex min-w-0 flex-1 items-stretch gap-0.5 md:flex-col md:justify-start md:gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const label = t(item.labelKey);
              return (
                <li
                  key={item.to}
                  className="min-w-[3.75rem] flex-1 basis-0 md:min-w-0 md:flex-none md:basis-auto"
                >
                  <NavLink
                    to={item.to}
                    title={label}
                    aria-label={label}
                    onClick={(event) => {
                      event.preventDefault();
                      hyperspaceNavigate(item.to);
                    }}
                    className={({ isActive }) => {
                      const active =
                        isActive || (item.alsoActiveFor?.includes(location.pathname) ?? false);
                      return [
                        'flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 font-body text-[10px] leading-tight font-medium transition-colors sm:text-[11px]',
                        'md:py-2.5 md:text-sm',
                        isSidebarCollapsed
                          ? 'md:flex-col md:justify-center md:px-0'
                          : 'md:flex-row md:justify-start md:gap-3 md:px-3',
                        active ? 'text-blue' : 'text-ink-3 hover:text-ink',
                      ].join(' ');
                    }}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span
                      className={[
                        'max-w-full truncate text-center md:text-left',
                        isSidebarCollapsed ? 'md:hidden' : 'md:inline',
                      ].join(' ')}
                    >
                      {label}
                    </span>
                  </NavLink>
                </li>
              );
            })}

            <li className="min-w-[3.75rem] flex-1 basis-0 md:hidden">
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 font-body text-[10px] leading-tight font-medium text-ink-3 transition-colors hover:text-ink sm:text-[11px]"
                aria-label={t('appLayout.logout')}
              >
                <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate text-center">{t('appLayout.logout')}</span>
              </button>
            </li>
          </ul>

          <div className="mt-auto hidden flex-col gap-1 md:flex">
            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed((prev) => !prev);
              }}
              className={[
                'flex items-center rounded-xl py-2.5 font-body text-sm font-medium text-ink-3 transition-colors hover:bg-bg-soft hover:text-ink',
                isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
              ].join(' ')}
              aria-expanded={!isSidebarCollapsed}
              aria-label={
                isSidebarCollapsed ? t('appLayout.expandSidebar') : t('appLayout.collapseSidebar')
              }
              title={
                isSidebarCollapsed ? t('appLayout.expandSidebar') : t('appLayout.collapseSidebar')
              }
            >
              {isSidebarCollapsed ? (
                <ChevronsRight className="h-5 w-5 shrink-0" aria-hidden />
              ) : (
                <>
                  <ChevronsLeft className="h-5 w-5 shrink-0" aria-hidden />
                  <span>{t('appLayout.collapseSidebar')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className={[
                'flex items-center rounded-xl py-2.5 font-body text-sm font-medium text-ink-3 transition-colors hover:bg-bg-soft hover:text-ink',
                isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3',
              ].join(' ')}
              aria-label={t('appLayout.logout')}
              title={t('appLayout.logout')}
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
              {!isSidebarCollapsed ? <span>{t('appLayout.logout')}</span> : null}
            </button>
          </div>
        </div>
      </nav>

      <main className="min-h-dvh w-full min-w-0 pb-24 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
