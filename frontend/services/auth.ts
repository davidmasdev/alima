import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { apiRequest } from '@/services/api';
import type {
  AuthMessageResponse,
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  OAuthGoogleRequest,
  RegisterRequest,
  ResendVerificationRequest,
  ResetPasswordRequest,
  User,
} from '@/types/auth';

const TOKEN_KEY = 'alima_access_token';
const USER_KEY = 'alima_user';

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

export async function saveSession(authResponse: AuthResponse): Promise<void> {
  await setItem(TOKEN_KEY, authResponse.access_token);
  await setItem(USER_KEY, JSON.stringify(authResponse.user));
}

export async function clearSession(): Promise<void> {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_KEY);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<User | null> {
  const rawUser = await getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch {
    await deleteItem(USER_KEY);
    return null;
  }
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const authResponse = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await saveSession(authResponse);
  return authResponse;
}

export async function register(payload: RegisterRequest): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resendVerification(
  payload: ResendVerificationRequest,
): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(
  payload: ForgotPasswordRequest,
): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(
  payload: ResetPasswordRequest,
): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function googleOAuth(payload: OAuthGoogleRequest): Promise<AuthResponse> {
  const authResponse = await apiRequest<AuthResponse>('/auth/oauth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await saveSession(authResponse);
  return authResponse;
}

export async function me(): Promise<User> {
  const token = await getToken();
  if (!token) {
    throw new Error('No hay sesión guardada');
  }

  return apiRequest<User>('/auth/me', { token });
}

export async function restoreSession(): Promise<User | null> {
  const token = await getToken();
  if (!token) {
    return null;
  }

  try {
    const user = await me();
    await setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    await clearSession();
    return null;
  }
}

export const authService = {
  clearSession,
  getStoredUser,
  getToken,
  forgotPassword,
  googleOAuth,
  login,
  me,
  register,
  resendVerification,
  resetPassword,
  restoreSession,
  saveSession,
};
