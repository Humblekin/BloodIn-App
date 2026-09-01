// Project LifeOrbit — App Store (Zustand)
// Global app-wide state: theme, onboarding, connectivity.

import { create } from 'zustand';

interface AppState {
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: () => void;

  // Network
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Modals / Global UI
  isReportModalVisible: boolean;
  reportTarget: { type: 'user' | 'community' | 'request' | 'message'; id: string } | null;
  showReportModal: (target: { type: 'user' | 'community' | 'request' | 'message'; id: string }) => void;
  hideReportModal: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Theme — default to light mode per spec (professional, not dark-mode-first)
  isDarkMode: false,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  // Onboarding
  hasCompletedOnboarding: false,
  setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

  // Network
  isConnected: true,
  setConnected: (connected) => set({ isConnected: connected }),

  // Report modal
  isReportModalVisible: false,
  reportTarget: null,
  showReportModal: (target) => set({ isReportModalVisible: true, reportTarget: target }),
  hideReportModal: () => set({ isReportModalVisible: false, reportTarget: null }),
}));
