import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/ui/app-layout';
import { AwakeningScreen } from '@/features/awakening/awakening-screen';
import { CreateProfileScreen } from '@/features/onboarding/create-profile-screen';
import { WelcomeScreen } from '@/features/onboarding/welcome-screen';
import { DiscoveryChat } from '@/features/discovery/discovery-chat';
import { LiveScreen } from '@/features/live/live-screen';
import { LiveKitTestScreen } from '@/features/livekit-test/livekit-test-screen';
import { IntentProfileScreen } from '@/features/intent-profile/intent-profile-screen';
import { PossibilityMap } from '@/features/possibility-map/possibility-map';
import { TodayScreen } from '@/features/today/today-screen';
import { TransformationPlanScreen } from '@/features/transformation-plan/transformation-plan-screen';
import { WatchtowersScreen } from '@/features/watchtowers/watchtowers-screen';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AwakeningScreen />} />
        <Route path="/awakening" element={<Navigate to="/" replace />} />
        <Route path="/onboarding" element={<CreateProfileScreen />} />
        <Route path="/welcome" element={<WelcomeScreen />} />
        {/* Temporary LiveKit proof of concept — remove with src/features/livekit-test/. */}
        <Route path="/livekit-test" element={<LiveKitTestScreen />} />
        <Route element={<AppLayout />}>
          <Route path="/today" element={<TodayScreen />} />
          <Route path="/plan" element={<TransformationPlanScreen />} />
          <Route path="/map" element={<PossibilityMap />} />
          <Route path="/possibility-map" element={<Navigate to="/map" replace />} />
          <Route path="/guide" element={<DiscoveryChat />} />
          <Route path="/discovery" element={<Navigate to="/guide" replace />} />
          <Route path="/watchtowers" element={<WatchtowersScreen />} />
          <Route path="/live" element={<LiveScreen />} />
          <Route path="/you" element={<IntentProfileScreen />} />
          <Route path="/profile" element={<Navigate to="/you" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
