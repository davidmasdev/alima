import { apiRequest } from '@/services/api';
import { authService } from '@/services/auth';
import type { DailyEntry, DailyEntryPayload, DailyLog, Food, MealType } from '@/types/dailyLog';

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

export async function searchFoods(query: string): Promise<Food[]> {
  const params = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : '';
  return requestWithToken<Food[]>(`/foods${params}`);
}

export async function getMealTypes(): Promise<MealType[]> {
  return requestWithToken<MealType[]>('/meal-types');
}

export async function updateMealTypes(nombres: string[]): Promise<MealType[]> {
  return requestWithToken<MealType[]>('/meal-types', {
    method: 'PUT',
    body: JSON.stringify({ nombres }),
  });
}

export async function getDailyLog(date: string): Promise<DailyLog> {
  return requestWithToken<DailyLog>(`/daily-log?date=${encodeURIComponent(date)}`);
}

export async function addEntry(payload: DailyEntryPayload): Promise<DailyEntry> {
  return requestWithToken<DailyEntry>('/daily-log/entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteEntry(entryId: string): Promise<void> {
  return requestWithToken<void>(`/daily-log/entries/${entryId}`, {
    method: 'DELETE',
  });
}

export const dailyLogService = {
  addEntry,
  deleteEntry,
  getDailyLog,
  getMealTypes,
  searchFoods,
  updateMealTypes,
};

