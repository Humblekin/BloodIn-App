// Project LifeOrbit — Root Layout
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

let EdgeToEdge: React.ComponentType | null = null;
if (Platform.OS !== 'web') {
  EdgeToEdge = require('react-native-edge-to-edge').EdgeToEdge;
}
import { useAuthStore } from '../features/auth/stores/authStore';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  
  const { initialize, isInitialized, user } = useAuthStore();

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
    if (!fontsLoaded || !isInitialized) return;

    // Hide splash screen once fonts and auth are ready
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === '(auth)';

    if (user && inAuthGroup) {
      // If user is signed in and trying to access auth screens, redirect to main
      router.replace('/(main)/(tabs)');
    } else if (!user && !inAuthGroup) {
      // If user is not signed in and trying to access main screens, redirect to auth
      router.replace('/(auth)/welcome');
    }
  }, [user, fontsLoaded, isInitialized, segments]);

  if (!fontsLoaded || !isInitialized) {
    return null;
  }

  return (
    <>
      {EdgeToEdge && <EdgeToEdge />}
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
