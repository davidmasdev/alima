export type ProgressRange = 'week' | 'month' | 'total';

export interface ProgressDay {
  fecha: string;
  calorias: number;
  objetivo_calorias: number | null;
  registrado: boolean;
  cumplido: boolean | null;
}

export interface WeightPoint {
  fecha: string;
  peso: number;
}

export interface WeightPayload {
  fecha?: string;
  peso: number;
}

export interface ProgressSummary {
  rango: ProgressRange;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  dias_registrados: number;
  dias_cumplidos: number;
  calorias_promedio: number;
  racha_actual: number;
}

export interface ProgressResponse {
  range: ProgressRange;
  objetivo_calorias: number | null;
  summary: ProgressSummary;
  days: ProgressDay[];
  calories_series: ProgressDay[];
  weight_series: WeightPoint[];
}
