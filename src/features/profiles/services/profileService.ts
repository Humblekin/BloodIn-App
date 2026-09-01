// Project LifeOrbit — Profile Service
// Encapsulates all Supabase interactions for the profiles domain.

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import type { ProfileRow, PrivacySettingsRow } from '@/types/database';

export const profileService = {
  // ─── Fetch ────────────────────────────────────────────

  async getOwnProfile(): Promise<ProfileRow | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data as ProfileRow;
  },

  async getProfileById(userId: string): Promise<ProfileRow | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ProfileRow;
  },

  // ─── Update ───────────────────────────────────────────

  async updateProfile(userId: string, updates: Partial<ProfileRow>): Promise<ProfileRow> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as ProfileRow;
  },

  async updateAvatar(userId: string, uri: string): Promise<string> {
    // Infer a content type + extension from the picked file so the object is
    // served with the correct MIME type (avoids browsers refusing to render it).
    const extension = (uri.split('.').pop() || 'jpg').toLowerCase();
    const isHeic = extension === 'heic' || extension === 'heif';
    const ext = isHeic ? 'jpg' : ['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(extension) ? extension : 'jpg';
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

    const fileName = `${userId}/avatar-${Date.now()}.${ext}`;

    // Choose an upload carrier that works on the current platform.
    //  - React Native: `fetch(file://...)` is not supported, so we send a native
    //    FormData with a { uri, name, type } file entry (RN handles file URIs in
    //    FormData natively).
    //  - Web: fetch() supports data/blob URLs fine, so a Blob is ideal.
    const isNative = Platform.OS !== 'web';

    let body: Blob | FormData;
    if (isNative) {
      const form = new FormData();
      form.append('cacheControl', '3600');
      form.append('', { uri, name: `avatar-${Date.now()}.${ext}`, type: contentType } as unknown as Blob);
      body = form;
    } else {
      const response = await fetch(uri);
      body = await response.blob();
    }

    const uploadOptions = isNative
      ? { upsert: true }
      : { upsert: true, contentType, cacheControl: '3600' };

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, body, uploadOptions);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    await profileService.updateProfile(userId, { avatar_url: publicUrl });
    return publicUrl;
  },

  // ─── Privacy ──────────────────────────────────────────

  async getPrivacySettings(userId: string): Promise<PrivacySettingsRow | null> {
    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as PrivacySettingsRow;
  },

  async updatePrivacySettings(
    userId: string,
    updates: Partial<PrivacySettingsRow>
  ): Promise<PrivacySettingsRow> {
    const { data, error } = await supabase
      .from('privacy_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as PrivacySettingsRow;
  },
};
