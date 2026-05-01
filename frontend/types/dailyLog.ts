export interface Food {
  id: string;
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  unidad_base: 'g' | 'ml';
  codigo_qr: string | null;
}

export interface MealType {
  id: string;
  nombre: string;
  orden: number;
}

export interface DailyEntry {
  id: string;
  alimento_id: string;
  alimento_nombre: string;
  cantidad: number;
  unidad: 'g' | 'ml';
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface MealLog {
  tipo: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  entries: DailyEntry[];
}

export interface DailyTotals {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface DailyLog {
  fecha: string;
  meal_types: string[];
  totals: DailyTotals;
  meals: MealLog[];
}

export interface DailyEntryPayload {
  fecha: string;
  tipo: string;
  alimento_id: string;
  cantidad: number;
  unidad: 'g' | 'ml';
}

