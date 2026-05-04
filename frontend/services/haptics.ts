import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

async function runHaptic(action: () => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await action();
  } catch {
    // Haptics are optional feedback and should never block the UI.
  }
}

export function lightImpact(): Promise<void> {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function mediumImpact(): Promise<void> {
  return runHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function successFeedback(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningFeedback(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function errorFeedback(): Promise<void> {
  return runHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
