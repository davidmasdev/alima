export interface User {
  id: string;
  email: string;
  nombre: string | null;
  fecha_nacimiento: string | null;
  validada: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

export interface AuthMessageResponse {
  message: string;
  user: User | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre?: string;
  fecha_nacimiento?: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
