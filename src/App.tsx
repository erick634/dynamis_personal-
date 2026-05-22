import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/ui/app-layout';
import { AwakeningScreen } from '@/features/awakening/awakening-screen';
import { DiscoveryChat } from '@/features/discovery/discovery-chat';
import { IntentProfileScreen } from '@/features/intent-profile/intent-profile-screen';
import { PossibilityMap } from '@/features/possibility-map/possibility-map';
import { TodayScreen } from '@/features/today/today-screen';
import { TransformationPlanScreen } from '@/features/transformation-plan/transformation-plan-screen';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AwakeningScreen />} />
        <Route path="/awakening" element={<Navigate to="/" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/today" element={<TodayScreen />} />
          <Route path="/plan" element={<TransformationPlanScreen />} />
          <Route path="/map" element={<PossibilityMap />} />
          <Route path="/possibility-map" element={<Navigate to="/map" replace />} />
          <Route path="/guide" element={<DiscoveryChat />} />
          <Route path="/discovery" element={<Navigate to="/guide" replace />} />
          <Route path="/you" element={<IntentProfileScreen />} />
          <Route path="/profile" element={<Navigate to="/you" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
