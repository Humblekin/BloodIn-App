// Project LifeOrbit — Main Stack Layout
import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="posts/create" />
      <Stack.Screen name="posts/[id]" />
      <Stack.Screen name="campaigns/create" />
      <Stack.Screen name="campaigns/[id]" />
      <Stack.Screen name="community/create" />
      <Stack.Screen name="community/manage" />
      <Stack.Screen name="community/[id]" />
      <Stack.Screen name="messages/index" />
      <Stack.Screen name="messages/[id]" />
      <Stack.Screen name="requests/create" />
      <Stack.Screen name="requests/[id]" />
    </Stack>
  );
}
