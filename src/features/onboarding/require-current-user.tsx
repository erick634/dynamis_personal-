import { Navigate, Outlet } from 'react-router-dom';

import { useCurrentUser } from '@/stores/current-user';

/**
 * Gates screens that assume a persisted CurrentUser (Today, Plan, Profile, etc.).
 * Discovery chat (`/` / `/guide`) is intentionally outside this guard so first-time
 * visitors can start talking and complete identity inline.
 */
export function RequireCurrentUser() {
  const user = useCurrentUser((state) => state.user);

  if (!user) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
