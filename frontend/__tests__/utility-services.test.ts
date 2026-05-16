import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { profileService } from '@/services/profile';

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
  },
  NotificationFeedbackType: {
    Error: 'Error',
    Success: 'Success',
    Warning: 'Warning',
  },
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('@/services/profile', () => ({
  profileService: {
    getProfile: jest.fn(),
    isProfileComplete: jest.fn(),
  },
}));

const mockedHaptics = Haptics as jest.Mocked<typeof Haptics>;
const mockedProfileService = profileService as jest.Mocked<typeof profileService>;
const mockedRouter = router as jest.Mocked<typeof router>;

describe('utility services', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    jest.clearAllMocks();
  });

  it('runs native haptic feedback and ignores haptic errors', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    const haptics = require('@/services/haptics');

    mockedHaptics.impactAsync.mockResolvedValue(undefined);
    mockedHaptics.notificationAsync.mockResolvedValue(undefined);

    await haptics.lightImpact();
    await haptics.mediumImpact();
    await haptics.successFeedback();
    await haptics.warningFeedback();
    mockedHaptics.notificationAsync.mockRejectedValueOnce(new Error('not available'));
    await haptics.errorFeedback();

    expect(mockedHaptics.impactAsync).toHaveBeenCalledWith('Light');
    expect(mockedHaptics.impactAsync).toHaveBeenCalledWith('Medium');
    expect(mockedHaptics.notificationAsync).toHaveBeenCalledWith('Success');
    expect(mockedHaptics.notificationAsync).toHaveBeenCalledWith('Warning');
    expect(mockedHaptics.notificationAsync).toHaveBeenCalledWith('Error');
  });

  it('skips haptic feedback on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const haptics = require('@/services/haptics');

    await haptics.lightImpact();

    expect(mockedHaptics.impactAsync).not.toHaveBeenCalled();
  });

  it('redirects authenticated users according to profile completion', async () => {
    const { redirectAfterAuthenticatedSession } = require('@/services/oauth');
    const profile = { nombre: 'Ana' };
    mockedProfileService.getProfile.mockResolvedValue(profile as never);
    mockedProfileService.isProfileComplete.mockReturnValueOnce(true).mockReturnValueOnce(false);

    await redirectAfterAuthenticatedSession();
    expect(mockedRouter.replace).toHaveBeenCalledWith('/(tabs)/today');

    await redirectAfterAuthenticatedSession();
    expect(mockedRouter.replace).toHaveBeenCalledWith('/onboarding/step1');
  });
});
