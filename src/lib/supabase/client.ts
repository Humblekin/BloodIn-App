// Project LifeOrbit — Supabase Client
// Initializes the Supabase client with secure storage for auth tokens.
// Only the anon (public) key is used here. NEVER place the service_role key in mobile code.

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Environment variables — set in .env and loaded via expo-constants or app.config
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[BloodIn] Supabase credentials not configured. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Secure storage adapter for Supabase auth
// Uses expo-secure-store (hardware-backed keychain) instead of AsyncStorage
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      // Web fallback — use localStorage (acceptable for development)
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      console.warn(`[SecureStore] Failed to get item: ${key}`);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      console.warn(`[SecureStore] Failed to set item: ${key}`);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      console.warn(`[SecureStore] Failed to remove item: ${key}`);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile
  },
});
