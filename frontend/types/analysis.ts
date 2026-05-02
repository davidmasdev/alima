export interface AnalysisPayload {
  fecha: string;
}

export interface AnalysisResponse {
  id: string;
  fecha: string;
  puntuacion: number;
  estado_proteinas: string;
  estado_carbohidratos: string;
  estado_grasas: string;
  estado_micronutrientes: string;
  consejo: string;
  dias_analizados: number;
}
