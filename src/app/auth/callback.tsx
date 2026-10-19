// BloodIn — Auth callback screen (bloodin://auth/callback)
// Landing route for Supabase e-mail confirmation links. The one-time code (PKCE)
// or token fragment is processed exactly once; on success the user is routed
// into the app or back to sign-in. Recovery links are handled separately by
// the root layout and the reset-password screen.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { CheckCircle2, XCircle } from 'lucide-react-native';

import { Screen } from '../../components/layout/Screen';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase/client';
import { useAuthStore } from '../../features/auth/stores/authStore';
import {
  isAuthCallbackUrl,
  processAuthCallbackUrl,
} from '../../features/auth/authCallback';
import { Colors } from '../../constants/colors';
import { FontFamily, FontSize } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

type Phase = 'working' | 'signed-in' | 'confirmed-no-session' | 'error';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const url = useURL();
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>('working');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!url || startedRef.current) return;
    if (!isAuthCallbackUrl(url)) return;
    startedRef.current = true;

    void (async () => {
      const result = await processAuthCallbackUrl(url);

      if (result.kind === 'error') {
        setMessage(result.message ?? 'The link is invalid or has expired.');
        setPhase('error');
        return;
      }

      if (result.kind === 'recovery') {
        router.replace('/(auth)/reset-password');
        return;
      }

      if (result.kind === 'none') {
        // No auth payload in the URL — nothing to confirm.
        setMessage('This link does not contain a valid confirmation.');
        setPhase('error');
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setPhase('signed-in');
        // Sync the store before navigating so the auth guard sees the user.
        await useAuthStore.getState().refreshSession();
        router.replace('/(main)/(tabs)');
      } else {
        // Confirmation succeeded but the flow did not create a session
        // (e-mail confirmation without auto sign-in).
        setPhase('confirmed-no-session');
      }
    })();
  }, [url, router]);

  return (
    <View style={{ flex: 1 }}>
      <Header showBack transparent />
      <Screen padding>
        <View style={styles.content}>
          {phase === 'working' ? (
            <>
              <Text style={styles.title}>Completing sign-in…</Text>
              <Text style={styles.subtitle}>
                Please wait while BloodIn verifies your link.
              </Text>
            </>
          ) : phase === 'confirmed-no-session' ? (
            <>
              <CheckCircle2 size={40} color={Colors.primary.DEFAULT} />
              <Text style={styles.title}>Account confirmed</Text>
              <Text style={styles.subtitle}>
                Your e-mail has been confirmed. You can now sign in to BloodIn.
              </Text>
              <Button
                title="Go to Login"
                size="lg"
                fullWidth
                onPress={() => router.replace('/(auth)/login')}
                style={styles.button}
              />
            </>
          ) : phase === 'error' ? (
            <>
              <XCircle size={40} color={Colors.semantic.critical.DEFAULT} />
              <Text style={styles.title}>Link not accepted</Text>
              <Text style={styles.subtitle}>{message}</Text>
              <Button
                title="Back to Login"
                size="lg"
                fullWidth
                onPress={() => router.replace('/(auth)/login')}
                style={styles.button}
              />
              <Button
                title="Request a New Link"
                size="lg"
                fullWidth
                variant="outline"
                onPress={() => router.replace('/(auth)/reset-password')}
                style={styles.button}
              />
            </>
          ) : (
            <Text style={styles.subtitle}>Signed in…</Text>
          )}
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xl,
    color: Colors.dark.DEFAULT,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.dark.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.sm,
  },
});
