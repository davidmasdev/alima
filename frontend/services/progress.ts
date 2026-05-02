import { apiRequest } from '@/services/api';
import { authService } from '@/services/auth';
import type { ProgressRange, ProgressResponse, WeightPayload } from '@/types/progress';

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

export async function getProgress(
  range: ProgressRange,
  anchorDate: string,
): Promise<ProgressResponse> {
  const params = `?range=${range}&anchor_date=${encodeURIComponent(anchorDate)}`;
  return requestWithToken<ProgressResponse>(`/progress${params}`);
}

export async function saveWeight(
  payload: WeightPayload,
  range: ProgressRange,
  anchorDate: string,
): Promise<ProgressResponse> {
  const params = `?range=${range}&anchor_date=${encodeURIComponent(anchorDate)}`;
  return requestWithToken<ProgressResponse>(`/progress/weight${params}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export const progressService = {
  getProgress,
  saveWeight,
};
