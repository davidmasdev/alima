import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { apiRequest } from '@/services/api';
import { authService } from '@/services/auth';
import type { OnboardingDraft, Profile, ProfilePayload } from '@/types/profile';

const ONBOARDING_DRAFT_KEY = 'alima_onboarding_draft';

function getWebStorage(): Storage | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

async function setItem(key: string, value: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  const webStorage = getWebStorage();
  if (webStorage) {
    return webStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

async function requestWithToken<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await authService.getToken();
  if (!token) {
    throw new Error('No hay sesión guardada');
  }

  return apiRequest<T>(path, { ...options, token });
}

export async function getProfile(): Promise<Profile> {
  return requestWithToken<Profile>('/profile');
}

export async function saveProfile(payload: ProfilePayload): Promise<Profile> {
  return requestWithToken<Profile>('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteAccount(): Promise<void> {
  await requestWithToken<void>('/profile', { method: 'DELETE' });
  await authService.clearSession();
}

export async function saveOnboardingDraft(draft: OnboardingDraft): Promise<void> {
  await setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export async function getOnboardingDraft(): Promise<OnboardingDraft | null> {
  const rawDraft = await getItem(ONBOARDING_DRAFT_KEY);
  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft) as OnboardingDraft;
  } catch {
    await deleteItem(ONBOARDING_DRAFT_KEY);
    return null;
  }
}

export async function clearOnboardingDraft(): Promise<void> {
  await deleteItem(ONBOARDING_DRAFT_KEY);
}

export const profileService = {
  clearOnboardingDraft,
  deleteAccount,
  getOnboardingDraft,
  getProfile,
  saveOnboardingDraft,
  saveProfile,
};

