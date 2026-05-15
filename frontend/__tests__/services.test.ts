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

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;
const mockedGetToken = authService.getToken as jest.MockedFunction<typeof authService.getToken>;

describe('frontend services', () => {
  beforeEach(() => {
    mockedApiRequest.mockResolvedValue({} as never);
    mockedGetToken.mockResolvedValue('token-1');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('builds daily log requests with encoded parameters and token', async () => {
    await dailyLogService.searchFoods('yogur griego');
    expect(mockedApiRequest).toHaveBeenLastCalledWith('/foods?query=yogur%20griego', {
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

  it('rejects authenticated requests when there is no saved token', async () => {
    mockedGetToken.mockResolvedValueOnce(null);

    await expect(profileService.getProfile()).rejects.toThrow('No hay sesi');
    expect(mockedApiRequest).not.toHaveBeenCalled();
  });
});
