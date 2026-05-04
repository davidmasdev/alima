import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';
import { authService } from '@/services/auth';
import { profileService } from '@/services/profile';

function RootNavigator() {
  const { colors, effectiveTheme } = useAppTheme();
  const styles = createStyles(colors);

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
    <View style={styles.webRoot}>
      <View style={styles.webFrame}>
      <StatusBar style={effectiveTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) => StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? colors.disabled : colors.background,
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    backgroundColor: colors.background,
  },
});
