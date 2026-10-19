// Project LifeOrbit — Root Layout
import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../features/auth/stores/authStore';
import { isRecoveryCallbackUrl, processAuthCallbackUrl } from '../features/auth/authCallback';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const { initialize, refreshSession, isInitialized, user } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    // Password-recovery deep links (bloodin://reset-password...). E-mail
    // confirmation links (bloodin://auth/callback...) are processed by the
    // dedicated auth/callback screen so the two flows never exchange the same
    // code twice. Raw callback URLs are never logged — they can contain tokens.
    const handleAuthUrl = (url: string) => {
      if (!isRecoveryCallbackUrl(url)) return;

      void processAuthCallbackUrl(url).then(async (result) => {
        const current = segmentsRef.current as string[];
        const onResetScreen = current[0] === '(auth)' && current[1] === 'reset-password';

        if (result.kind === 'recovery') {
          // Make sure the store reflects the recovery session even if the
          // PASSWORD_RECOVERY event fired before the listener was attached.
          await refreshSession();
          // Route to the reset screen only when the deep link did not already
          // land there — replacing the current route would remount the screen
          // and wipe any password the user has started typing.
          if (!onResetScreen) router.replace('/(auth)/reset-password');
          return;
        }

        if (result.kind === 'error') {
          const message = result.message ?? 'The link is invalid or has expired.';
          // Safe to log: messages are fixed, user-facing sentences (no tokens).
          console.warn('[Auth] Recovery link not processed:', message);
          if (!onResetScreen) {
            router.replace(
              `/(auth)/reset-password?error_message=${encodeURIComponent(message)}`
            );
          } else {
            void router.setParams({ error_message: message });
          }
        }
      });
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));
    void Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (!fontsLoaded || !isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isPasswordResetRoute = inAuthGroup && (segments as string[])[1] === 'reset-password';

    if (user && inAuthGroup && !isPasswordResetRoute) {
      // If user is signed in and trying to access auth screens, redirect to main
      router.replace('/(main)/(tabs)');
    } else if (!user && !inAuthGroup) {
      // If user is not signed in and trying to access main screens, redirect to auth
      router.replace('/(auth)/welcome');
    }

    // Let the first ready frame mount before removing the native splash.
    requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });
  }, [user, fontsLoaded, isInitialized, segments]);

  if (!fontsLoaded || !isInitialized) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
