import { router } from 'expo-router';

import { profileService } from '@/services/profile';

export async function redirectAfterAuthenticatedSession(): Promise<void> {
  const profile = await profileService.getProfile();
  router.replace(
    profileService.isProfileComplete(profile)
      ? '/(tabs)/today'
      : '/onboarding/step1',
  );
}
