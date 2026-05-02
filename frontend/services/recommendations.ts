import { apiRequest } from '@/services/api';
import { authService } from '@/services/auth';
import type { DailyLog } from '@/types/dailyLog';
import type {
  RecommendationApplyPayload,
  RecommendationPayload,
  RecommendationResponse,
} from '@/types/recommendations';

async function requestWithToken<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await authService.getToken();
  if (!token) {
    throw new Error('No hay sesion guardada');
  }

  return apiRequest<T>(path, { ...options, token });
}

export async function createRecommendation(
  payload: RecommendationPayload,
): Promise<RecommendationResponse> {
  return requestWithToken<RecommendationResponse>('/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addRecommendationToMeal(
  recommendationId: string,
  payload: RecommendationApplyPayload,
): Promise<DailyLog> {
  return requestWithToken<DailyLog>(`/recommendations/${recommendationId}/add-to-meal`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const recommendationsService = {
  addRecommendationToMeal,
  createRecommendation,
};
