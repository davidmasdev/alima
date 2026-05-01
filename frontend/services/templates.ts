import { apiRequest } from '@/services/api';
import { authService } from '@/services/auth';
import type { MealTemplate, TemplatePayload } from '@/types/templates';

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

export async function listTemplates(sort: 'name' | 'recent' = 'name'): Promise<MealTemplate[]> {
  return requestWithToken<MealTemplate[]>(`/templates?sort=${sort}`);
}

export async function createTemplate(payload: TemplatePayload): Promise<MealTemplate> {
  return requestWithToken<MealTemplate>('/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTemplate(
  templateId: string,
  payload: TemplatePayload,
): Promise<MealTemplate> {
  return requestWithToken<MealTemplate>(`/templates/${templateId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteTemplate(templateId: string): Promise<void> {
  return requestWithToken<void>(`/templates/${templateId}`, {
    method: 'DELETE',
  });
}

export const templatesService = {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
};
