import { apiRequest } from '@/services/api';
import { authService } from '@/services/auth';
import type { AnalysisPayload, AnalysisResponse } from '@/types/analysis';

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

export async function createAnalysis(payload: AnalysisPayload): Promise<AnalysisResponse> {
  return requestWithToken<AnalysisResponse>('/analysis', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const analysisService = {
  createAnalysis,
};
