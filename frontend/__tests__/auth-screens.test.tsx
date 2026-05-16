import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
let mockSearchParams: Record<string, string | undefined> = {};
const mockPromptGoogleAsync = jest.fn();
let mockGoogleRequest: unknown = {};
let mockGoogleResponse: unknown = null;

jest.mock('expo-router', () => ({
  router: mockRouter,
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useIdTokenAuthRequest: () => [mockGoogleRequest, mockGoogleResponse, mockPromptGoogleAsync],
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  FontAwesome: ({ name }: { name: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('@/constants/Colors').lightColors,
    effectiveTheme: 'light',
  }),
}));

jest.mock('@/services/oauth', () => ({
  redirectAfterAuthenticatedSession: jest.fn(),
}));

jest.mock('@/services/auth', () => ({
  authService: {
    forgotPassword: jest.fn(),
    googleOAuth: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    resendVerification: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockUser = {
  id: 'user-1',
  email: 'ana@example.com',
  nombre: 'Ana',
  fecha_nacimiento: null,
  validada: true,
};
const mockMessage = (message: string) => ({ message, user: null });

describe('auth screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    mockGoogleRequest = {};
    mockGoogleResponse = null;
    mockPromptGoogleAsync.mockResolvedValue({ type: 'dismiss' });
  });

  it('validates login inputs and sends valid credentials', async () => {
    const LoginScreen = require('@/app/(auth)/login').default;
    mockedAuthService.login.mockResolvedValue({
      access_token: 'token',
      token_type: 'bearer',
      user: mockUser,
    });

    render(<LoginScreen />);
    fireEvent.press(screen.getByLabelText(/Iniciar sesi/));

    expect(await screen.findByText('El correo es obligatorio')).toBeTruthy();
    expect(screen.getByText(/obligatoria/)).toBeTruthy();

    const [emailInput, passwordInput] = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(emailInput, 'ana@example.com');
    fireEvent.changeText(passwordInput, 'secret123');
    fireEvent.press(screen.getByLabelText(/Iniciar sesi/));

    await waitFor(() => {
      expect(mockedAuthService.login).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: 'secret123',
      });
    });
  });

  it('shows login errors and resends verification emails', async () => {
    const LoginScreen = require('@/app/(auth)/login').default;
    mockedAuthService.login.mockRejectedValue(new ApiError(403, 'Cuenta no validada'));
    mockedAuthService.resendVerification.mockResolvedValue(mockMessage('Correo reenviado'));

    render(<LoginScreen />);
    const [emailInput, passwordInput] = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(emailInput, 'ana@example.com');
    fireEvent.changeText(passwordInput, 'secret123');
    fireEvent.press(screen.getByLabelText(/Iniciar sesi/));

    expect(await screen.findByText(/Valida tu correo/)).toBeTruthy();
    fireEvent.press(screen.getByText('Reenviar correo'));

    await waitFor(() => {
      expect(mockedAuthService.resendVerification).toHaveBeenCalledWith({
        email: 'ana@example.com',
      });
    });
    expect(await screen.findByText('Correo reenviado')).toBeTruthy();
  });

  it('validates registration and routes to email verification after success', async () => {
    const RegisterScreen = require('@/app/(auth)/register').default;
    mockedAuthService.register.mockResolvedValue(mockMessage('Revisa tu correo'));

    render(<RegisterScreen />);
    fireEvent.press(screen.getByText('Registrarse'));

    expect(await screen.findByText('El correo es obligatorio')).toBeTruthy();
    expect(screen.getByText(/obligatoria/)).toBeTruthy();
    expect(screen.getByText(/Confirma tu/)).toBeTruthy();

    const [emailInput, passwordInput, confirmInput] = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(emailInput, 'ana@example.com');
    fireEvent.changeText(passwordInput, 'secret123');
    fireEvent.changeText(confirmInput, 'different');
    fireEvent.press(screen.getByText('Registrarse'));
    expect(await screen.findByText(/no coinciden/)).toBeTruthy();

    fireEvent.changeText(confirmInput, 'secret123');
    fireEvent.press(screen.getByText('Registrarse'));

    await waitFor(() => {
      expect(mockedAuthService.register).toHaveBeenCalledWith({
        email: 'ana@example.com',
        password: 'secret123',
      });
    });
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/verify-email-sent',
      params: { email: 'ana@example.com' },
    });
  });

  it('handles forgot password validation, success and backend errors', async () => {
    const ForgotPasswordScreen = require('@/app/(auth)/forgot-password').default;
    mockedAuthService.forgotPassword.mockResolvedValueOnce(mockMessage('Enlace enviado'));
    mockedAuthService.forgotPassword.mockRejectedValueOnce(new ApiError(404, 'No existe'));

    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByText('Enviar enlace'));
    expect(await screen.findByText('El correo es obligatorio')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('tu@email.com'), 'ana@example.com');
    fireEvent.press(screen.getByText('Enviar enlace'));
    expect(await screen.findByText('Enlace enviado')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('tu@email.com'), 'nobody@example.com');
    fireEvent.press(screen.getByText('Enviar enlace'));
    expect(await screen.findByText('No existe')).toBeTruthy();
  });

  it('renders email verification states and resends when needed', async () => {
    const VerifyEmailScreen = require('@/app/(auth)/verify-email').default;
    mockedAuthService.resendVerification.mockResolvedValue(mockMessage('Correo reenviado'));
    mockSearchParams = { status: 'expired' };

    render(<VerifyEmailScreen />);

    expect(screen.getByText('Enlace caducado')).toBeTruthy();
    fireEvent.press(screen.getByText('Reenviar correo'));
    expect(await screen.findByText('Introduce tu correo')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('tu@email.com'), 'ana@example.com');
    fireEvent.press(screen.getByText('Reenviar correo'));

    await waitFor(() => {
      expect(mockedAuthService.resendVerification).toHaveBeenCalledWith({
        email: 'ana@example.com',
      });
    });
  });

  it('resets passwords and routes after a successful update', async () => {
    const ResetPasswordScreen = require('@/app/(auth)/reset-password').default;
    mockSearchParams = { token: 'reset-token' };
    mockedAuthService.resetPassword.mockResolvedValue(mockMessage('ContraseÃ±a actualizada'));

    render(<ResetPasswordScreen />);
    fireEvent.press(screen.getByLabelText(/Guardar/));
    expect(await screen.findByText(/obligatoria/)).toBeTruthy();

    const [passwordInput, confirmInput] = screen.UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(passwordInput, 'secret123');
    fireEvent.changeText(confirmInput, 'different');
    fireEvent.press(screen.getByLabelText(/Guardar/));
    expect(await screen.findByText(/no coinciden/)).toBeTruthy();

    fireEvent.changeText(confirmInput, 'secret123');
    fireEvent.press(screen.getByLabelText(/Guardar/));

    await waitFor(() => {
      expect(mockedAuthService.resetPassword).toHaveBeenCalledWith({
        token: 'reset-token',
        password: 'secret123',
      });
    });
    expect(await screen.findByText('ContraseÃ±a actualizada')).toBeTruthy();
    fireEvent.press(screen.getByText(/Ir a iniciar/));
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
  });

  it('renders the verification sent screen and resends emails', async () => {
    const VerifyEmailSentScreen = require('@/app/(auth)/verify-email-sent').default;
    mockSearchParams = { email: 'ana@example.com' };
    mockedAuthService.resendVerification.mockResolvedValue(mockMessage('Correo reenviado'));

    render(<VerifyEmailSentScreen />);
    expect(screen.getByText('Revisa tu correo')).toBeTruthy();

    fireEvent.press(screen.getByText('Reenviar correo'));

    await waitFor(() => {
      expect(mockedAuthService.resendVerification).toHaveBeenCalledWith({
        email: 'ana@example.com',
      });
    });
    expect(await screen.findByText('Correo reenviado')).toBeTruthy();
  });

  it('routes from the welcome screen', () => {
    const WelcomeScreen = require('@/app/index').default;

    render(<WelcomeScreen />);

    fireEvent.press(screen.getByText('Comenzar ahora'));
    expect(mockRouter.push).toHaveBeenCalledWith('/login');

    fireEvent.press(screen.getByText('Crear cuenta'));
    expect(mockRouter.push).toHaveBeenCalledWith('/register');
  });
});
