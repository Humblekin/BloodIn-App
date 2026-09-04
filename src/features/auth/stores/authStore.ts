// Project LifeOrbit — Auth Store (Zustand)
// Manages authentication state and session.

import { create } from 'zustand';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { ProfileRow, PrivacySettingsRow } from '@/types/database';

// ─── State Shape ──────────────────────────────────────────
interface AuthState {
  // Session state
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  privacySettings: PrivacySettingsRow | null;

  // UI state
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Registration flow state
  registrationStep: number;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  fetchProfile: () => Promise<void>;
  fetchPrivacySettings: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileRow>) => Promise<{ error: string | null }>;
  updatePrivacySettings: (updates: Partial<PrivacySettingsRow>) => Promise<{ error: string | null }>;
  setRegistrationStep: (step: number) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // ─── Initial State ────────────────────────────────────
  session: null,
  user: null,
  profile: null,
  privacySettings: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  registrationStep: 0,

  // ─── Initialize ───────────────────────────────────────
  initialize: async () => {
    try {
      set({ isLoading: true });

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[Auth] Session retrieval error:', error.message);
        set({ session: null, user: null, isInitialized: true, isLoading: false });
        return;
      }

      if (session?.user) {
        set({ session, user: session.user });
        // Profile data is non-blocking; load it after the initial route can render.
        void Promise.all([
          get().fetchProfile(),
          get().fetchPrivacySettings(),
        ]);
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        set({ session: newSession, user: newSession?.user ?? null });

        if (event === 'SIGNED_IN' && newSession?.user) {
          await Promise.all([
            get().fetchProfile(),
            get().fetchPrivacySettings(),
          ]);
        }

        if (event === 'SIGNED_OUT') {
          set({ profile: null, privacySettings: null });
        }
      });

      set({ isInitialized: true, isLoading: false });
    } catch (err) {
      console.error('[Auth] Initialization error:', err);
      set({ isInitialized: true, isLoading: false, error: 'Failed to initialize authentication' });
    }
  },

  // ─── Sign Up ──────────────────────────────────────────
  signUp: async (email, password, displayName) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return { error };
      }

      // If email confirmation is required, user will be null until confirmed
      if (data.user) {
        set({ user: data.user, session: data.session });
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      set({ isLoading: false, error: message });
      return { error: { message } as AuthError };
    }
  },

  // ─── Sign In ──────────────────────────────────────────
  signIn: async (email, password) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return { error };
      }

      set({
        session: data.session,
        user: data.user,
        isLoading: false,
      });

      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      set({ isLoading: false, error: message });
      return { error: { message } as AuthError };
    }
  },

  // ─── Sign Out ─────────────────────────────────────────
  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      set({
        session: null,
        user: null,
        profile: null,
        privacySettings: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
      // Force clear state even if API call fails
      set({
        session: null,
        user: null,
        profile: null,
        privacySettings: null,
        isLoading: false,
      });
    }
  },

  // ─── Reset Password ──────────────────────────────────
  resetPassword: async (email) => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        set({ isLoading: false, error: error.message });
        return { error };
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed';
      set({ isLoading: false, error: message });
      return { error: { message } as AuthError };
    }
  },

  // ─── Fetch Profile ───────────────────────────────────
  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Profile might not exist yet (new user)
        if (error.code === 'PGRST116') {
          set({ profile: null });
          return;
        }
        console.warn('[Auth] Failed to fetch profile:', error.message);
        return;
      }

      set({ profile: data as ProfileRow });
    } catch (err) {
      console.error('[Auth] Profile fetch error:', err);
    }
  },

  // ─── Fetch Privacy Settings ──────────────────────────
  fetchPrivacySettings: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          set({ privacySettings: null });
          return;
        }
        console.warn('[Auth] Failed to fetch privacy settings:', error.message);
        return;
      }

      set({ privacySettings: data as PrivacySettingsRow });
    } catch (err) {
      console.error('[Auth] Privacy settings fetch error:', err);
    }
  },

  // ─── Update Profile ──────────────────────────────────
  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        set({ isLoading: false, error: error.message });
        return { error: error.message };
      }

      set({ profile: data as ProfileRow, isLoading: false });
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile update failed';
      set({ isLoading: false, error: message });
      return { error: message };
    }
  },

  // ─── Update Privacy Settings ─────────────────────────
  updatePrivacySettings: async (updates) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase
        .from('privacy_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        set({ isLoading: false, error: error.message });
        return { error: error.message };
      }

      set({ privacySettings: data as PrivacySettingsRow, isLoading: false });
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Privacy settings update failed';
      set({ isLoading: false, error: message });
      return { error: message };
    }
  },

  // ─── UI Actions ───────────────────────────────────────
  setRegistrationStep: (step) => set({ registrationStep: step }),
  clearError: () => set({ error: null }),
}));
