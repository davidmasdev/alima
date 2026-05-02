export interface RecommendationPayload {
  fecha: string;
  prompt?: string;
}

export interface RecommendationFood {
  nombre: string;
  cantidad: number;
  unidad: 'g' | 'ml';
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface RecommendationContent {
  nombre: string;
  alimentos: RecommendationFood[];
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  explicacion: string;
}

export interface RecommendationApplyPayload {
  fecha: string;
  tipo: string;
}

export interface RecommendationResponse {
  id: string;
  fecha: string;
  prompt: string;
  resultado: string;
  contenido: RecommendationContent;
  calorias_restantes: number;
  proteinas_restantes: number;
  carbohidratos_restantes: number;
  grasas_restantes: number;
}
