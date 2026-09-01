// Project LifeOrbit — Profile Service
// Encapsulates all Supabase interactions for the profiles domain.

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

    const response = await fetch(uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        upsert: true,
        contentType,
        cacheControl: '3600',
      });

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
