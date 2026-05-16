import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { analysisService } from '@/services/analysis';
import { dailyLogService } from '@/services/dailyLog';
import { profileService } from '@/services/profile';
import { progressService } from '@/services/progress';
import { recommendationsService } from '@/services/recommendations';
import { templatesService } from '@/services/templates';
import { apiRequest } from '@/services/api';
import { authService } from '@/services/auth';
import type { Profile } from '@/types/profile';

jest.mock('@/services/api', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('@/services/auth', () => ({
  authService: {
    clearSession: jest.fn(),
    getToken: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockedGetToken = authService.getToken as jest.MockedFunction<typeof authService.getToken>;
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('frontend services', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    mockedApiRequest.mockResolvedValue({} as never);
    mockedGetToken.mockResolvedValue('token-1');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds daily log requests with encoded parameters and token', async () => {
    await dailyLogService.searchFoods('   ');
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/foods', {
      token: 'token-1',
    });

    await dailyLogService.searchFoods('yogur griego');
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/foods?query=yogur%20griego', {
      token: 'token-1',
    });

    await dailyLogService.scanFood('8412345678901');
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/foods/scan', {
      method: 'POST',
      body: JSON.stringify({ code: '8412345678901' }),
      token: 'token-1',
    });

    await dailyLogService.getMealTypes();
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/meal-types', {
      token: 'token-1',
    });

    await dailyLogService.updateMealTypes(['Desayuno', 'Cena']);
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/meal-types', {
      method: 'PUT',
      body: JSON.stringify({ nombres: ['Desayuno', 'Cena'] }),
      token: 'token-1',
    });

    await dailyLogService.getDailyLog('2026-05-15');
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/daily-log?date=2026-05-15', {
      token: 'token-1',
    });

    const entryPayload = {
      fecha: '2026-05-15',
      tipo: 'Comida',
      alimento_id: 'food-1',
      cantidad: 125,
      unidad: 'g' as const,
    };

    await dailyLogService.addEntry(entryPayload);
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/daily-log/entries', {
      method: 'POST',
      body: JSON.stringify(entryPayload),
      token: 'token-1',
    });

    await dailyLogService.deleteEntry('entry-1');
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/daily-log/entries/entry-1', {
      method: 'DELETE',
      token: 'token-1',
    });

    await dailyLogService.addFromTemplate({
      fecha: '2026-05-15',
      tipo: 'Cena',
      template_id: 'template-1',
    });
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/daily-log/from-template', {
      method: 'POST',
      body: JSON.stringify({
        fecha: '2026-05-15',
        tipo: 'Cena',
        template_id: 'template-1',
      }),
      token: 'token-1',
    });
  });

  it('builds template, progress and AI requests', async () => {
    await templatesService.listTemplates('recent');
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/templates?sort=recent', {
      token: 'token-1',
    });

    await progressService.saveWeight({ fecha: '2026-05-15', peso: 74 }, 'month', '2026-05-15');
    expect(mockedApiRequest).toHaveBeenLastCalledWith(
      '/progress/weight?range=month&anchor_date=2026-05-15',
      {
        method: 'POST',
        body: JSON.stringify({ fecha: '2026-05-15', peso: 74 }),
        token: 'token-1',
      },
    );

    await recommendationsService.createRecommendation({ fecha: '2026-05-15', prompt: 'Cena ligera' });
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/recommendations', {
      method: 'POST',
      body: JSON.stringify({ fecha: '2026-05-15', prompt: 'Cena ligera' }),
      token: 'token-1',
    });

    await analysisService.createAnalysis({ fecha: '2026-05-15' });
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/analysis', {
      method: 'POST',
      body: JSON.stringify({ fecha: '2026-05-15' }),
      token: 'token-1',
    });
  });

  it('detects whether a profile is complete', () => {
    const completeProfile = {
      nombre: 'Ana',
      fecha_nacimiento: '1998-01-01',
      sexo: 'female',
      nivel_actividad: 'moderate',
      objetivo: 'maintain',
      peso: 62,
      altura: 168,
      calorias_diarias: 2100,
    } as Profile;

    expect(profileService.isProfileComplete(completeProfile)).toBe(true);
    expect(profileService.isProfileComplete({ ...completeProfile, peso: null })).toBe(false);
    expect(profileService.isProfileComplete({ ...completeProfile, objetivo: null })).toBe(false);
  });

  it('builds profile persistence and cleanup requests', async () => {
    const payload = {
      nombre: 'Ana',
      fecha_nacimiento: '1998-01-01',
      sexo: 'female' as const,
      nivel_actividad: 'moderate',
      objetivo: 'maintain',
      peso: 62,
      altura: 168,
    };

    await profileService.saveProfile(payload);
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
      token: 'token-1',
    });

    await profileService.deleteAccount();
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/profile', {
      method: 'DELETE',
      token: 'token-1',
    });
    expect(authService.clearSession).toHaveBeenCalled();
  });

  it('rejects authenticated requests when there is no saved token', async () => {
    mockedGetToken.mockResolvedValueOnce(null);

    await expect(profileService.getProfile()).rejects.toThrow('No hay sesi');
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });

  it('stores, restores and clears onboarding drafts on native storage', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios' });
    mockedSecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify({
      nombre: 'Ana',
      sexo: 'female',
      fecha_nacimiento: '1998-01-01',
    }));

    await profileService.saveOnboardingDraft({
      nombre: 'Ana',
      sexo: 'female',
      fecha_nacimiento: '1998-01-01',
    });

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'alima_onboarding_draft',
      JSON.stringify({
        nombre: 'Ana',
        sexo: 'female',
        fecha_nacimiento: '1998-01-01',
      }),
    );
    await expect(profileService.getOnboardingDraft()).resolves.toEqual({
      nombre: 'Ana',
      sexo: 'female',
      fecha_nacimiento: '1998-01-01',
    });

    mockedSecureStore.getItemAsync.mockResolvedValueOnce('{invalid');
    await expect(profileService.getOnboardingDraft()).resolves.toBeNull();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('alima_onboarding_draft');

    await profileService.clearOnboardingDraft();
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('alima_onboarding_draft');
  });

  it('uses localStorage for onboarding drafts on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    const storage = {
      getItem: jest.fn().mockReturnValue(JSON.stringify({
        nombre: 'Ana',
        sexo: 'female',
        fecha_nacimiento: '1998-01-01',
      })),
      removeItem: jest.fn(),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });

    await profileService.saveOnboardingDraft({
      nombre: 'Ana',
      sexo: 'female',
      fecha_nacimiento: '1998-01-01',
    });
    await expect(profileService.getOnboardingDraft()).resolves.toEqual({
      nombre: 'Ana',
      sexo: 'female',
      fecha_nacimiento: '1998-01-01',
    });
    await profileService.clearOnboardingDraft();

    expect(storage.setItem).toHaveBeenCalled();
    expect(storage.getItem).toHaveBeenCalledWith('alima_onboarding_draft');
    expect(storage.removeItem).toHaveBeenCalledWith('alima_onboarding_draft');
  });
});
