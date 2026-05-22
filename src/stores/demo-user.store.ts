import { create } from 'zustand';

import { DEMO_USER_ID } from '@/lib/config';

type DemoUserState = {
  userId: string;
};

export const useDemoUserStore = create<DemoUserState>(() => ({
  userId: DEMO_USER_ID,
}));
