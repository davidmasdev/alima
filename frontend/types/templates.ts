export interface TemplateItem {
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

export interface MealTemplate {
  id: string;
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  ultimo_uso: string | null;
  items: TemplateItem[];
}

export interface TemplateItemPayload {
  alimento_id: string;
  cantidad: number;
  unidad: 'g' | 'ml';
}

export interface TemplatePayload {
  nombre: string;
  items: TemplateItemPayload[];
}
