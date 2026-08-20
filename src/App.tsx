import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/ui/app-layout';
import { HyperspaceTransition } from '@/components/ui/hyperspace-transition';
import { AwakeningScreen } from '@/features/awakening/awakening-screen';
import { ChatHistoryScreen } from '@/features/chat-history/chat-history-screen';
import { ChatSessionScreen } from '@/features/chat-history/chat-session-screen';
import { DiscoveryChat } from '@/features/discovery/discovery-chat';
import { IntentProfileScreen } from '@/features/intent-profile/intent-profile-screen';
import { LiveKitTestScreen } from '@/features/livekit-test/livekit-test-screen';
import { CreateProfileScreen } from '@/features/onboarding/create-profile-screen';
import { LoginScreen } from '@/features/onboarding/login-screen';
import { RequireCurrentUser } from '@/features/onboarding/require-current-user';
import { PossibilityMap } from '@/features/possibility-map/possibility-map';
import { PortfolioScreen } from '@/features/portfolio/portfolio-screen';
import { ProfilesScreen } from '@/features/profiles/profiles-screen';
import { SharePublicPage } from '@/features/share/share-public-page';
import { TodayScreen } from '@/features/today/today-screen';
import { TransformationPlanScreen } from '@/features/transformation-plan/transformation-plan-screen';
import { WatchtowersScreen } from '@/features/watchtowers/watchtowers-screen';

export function App() {
  return (
    <BrowserRouter>
      <HyperspaceTransition />
      <Routes>
        <Route path="/awakening" element={<AwakeningScreen />} />
        <Route path="/onboarding" element={<CreateProfileScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/share/:token" element={<SharePublicPage />} />
        {/* Legacy live/welcome entry — chat is the conversation surface now. */}
        <Route path="/welcome" element={<Navigate to="/guide" replace />} />
        {/* Temporary LiveKit proof of concept — remove with src/features/livekit-test/. */}
        <Route path="/livekit-test" element={<LiveKitTestScreen />} />
        <Route element={<AppLayout />}>
          {/* Chat-first entry: identity can be completed inline during Discovery. */}
          <Route path="/" element={<DiscoveryChat />} />
          <Route path="/guide" element={<DiscoveryChat />} />
          <Route path="/discovery" element={<Navigate to="/guide" replace />} />
          <Route path="/live" element={<Navigate to="/guide" replace />} />
          <Route element={<RequireCurrentUser />}>
            <Route path="/today" element={<TodayScreen />} />
            <Route path="/plan" element={<TransformationPlanScreen />} />
            <Route path="/map" element={<PossibilityMap />} />
            <Route path="/possibility-map" element={<Navigate to="/map" replace />} />
            <Route path="/watchtowers" element={<WatchtowersScreen />} />
            <Route path="/chats" element={<ChatHistoryScreen />} />
            <Route path="/chats/:sessionId" element={<ChatSessionScreen />} />
            <Route path="/you" element={<IntentProfileScreen />} />
            <Route path="/profiles" element={<ProfilesScreen />} />
            <Route path="/portfolio" element={<PortfolioScreen />} />
            <Route path="/profile" element={<Navigate to="/you" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
