export interface Profile {
  email: string;
  nombre: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  nivel_actividad: string | null;
  objetivo: string | null;
  peso: number | null;
  altura: number | null;
  calorias_diarias: number | null;
}

export interface ProfilePayload {
  nombre: string;
  fecha_nacimiento: string;
  sexo: string;
  nivel_actividad: string;
  objetivo: string;
  peso: number;
  altura: number;
}

export interface OnboardingDraft {
  nombre: string;
  sexo: string;
  fecha_nacimiento: string;
}

