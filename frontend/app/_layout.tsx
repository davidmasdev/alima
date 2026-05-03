import { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { authService } from '@/services/auth';
import { profileService } from '@/services/profile';

export default function RootLayout() {
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const user = await authService.restoreSession();
      if (isMounted && user) {
        try {
          const profile = await profileService.getProfile();
          if (isMounted) {
            router.replace(
              profileService.isProfileComplete(profile)
                ? '/(tabs)/today'
                : '/onboarding/step1',
            );
          }
        } catch {
          await authService.clearSession();
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
