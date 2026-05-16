import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/services/api';
import { profileService } from '@/services/profile';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  router: mockRouter,
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

jest.mock('@/components/ui/Select', () => ({
  Select: ({ label, onSelect, error }: any) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={() => onSelect('female')}>
          <Text>{label}</Text>
        </TouchableOpacity>
        {error ? <Text>{error}</Text> : null}
      </>
    );
  },
}));

jest.mock('@/components/ui/DatePicker', () => ({
  DatePicker: ({ label, onSelect, error }: any) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => onSelect(new Date('1998-01-02T00:00:00.000Z'))}
        >
          <Text>{label}</Text>
        </TouchableOpacity>
        {error ? <Text>{error}</Text> : null}
      </>
    );
  },
}));

jest.mock('@/components/ui/NumberInput', () => ({
  NumberInput: ({ label, value, onChangeText, error }: any) => {
    const React = require('react');
    const { Text, TextInput } = require('react-native');
    return (
      <>
        <TextInput placeholder={label} value={value} onChangeText={onChangeText} />
        {error ? <Text>{error}</Text> : null}
      </>
    );
  },
}));

jest.mock('@/services/profile', () => ({
  profileService: {
    clearOnboardingDraft: jest.fn(),
    getProfile: jest.fn(),
    getOnboardingDraft: jest.fn(),
    saveOnboardingDraft: jest.fn(),
    saveProfile: jest.fn(),
  },
}));

const mockedProfileService = profileService as jest.Mocked<typeof profileService>;

describe('onboarding screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates and saves the first onboarding step', async () => {
    const OnboardingStep1Screen = require('@/app/(auth)/onboarding/step1').default;
    mockedProfileService.saveOnboardingDraft.mockResolvedValue();

    render(<OnboardingStep1Screen />);
    fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();
    expect(screen.getByText(/Selecciona tu g/)).toBeTruthy();
    expect(screen.getByText('Selecciona tu fecha de nacimiento')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Tu nombre'), ' Ana ');
    fireEvent.press(screen.getByLabelText(/G/));
    fireEvent.press(screen.getByLabelText('Fecha de nacimiento'));
    fireEvent.press(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(mockedProfileService.saveOnboardingDraft).toHaveBeenCalledWith({
        nombre: 'Ana',
        sexo: 'female',
        fecha_nacimiento: '1998-01-02',
      });
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/step2');
  });

  it('validates and submits the second onboarding step', async () => {
    const OnboardingStep2Screen = require('@/app/(auth)/onboarding/step2').default;
    mockedProfileService.getOnboardingDraft.mockResolvedValue({
      nombre: 'Ana',
      sexo: 'female',
      fecha_nacimiento: '1998-01-02',
    });
    mockedProfileService.saveProfile.mockResolvedValue({} as never);

    render(<OnboardingStep2Screen />);
    fireEvent.press(screen.getByText('Enviar'));

    expect(await screen.findByText('Selecciona tu nivel de actividad')).toBeTruthy();
    expect(screen.getByText('Selecciona tu objetivo')).toBeTruthy();
    expect(screen.getByText('Ingresa tu peso')).toBeTruthy();
    expect(screen.getByText('Ingresa tu altura')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Actividad semanal'));
    fireEvent.press(screen.getByLabelText('Tu objetivo'));
    fireEvent.changeText(screen.getByPlaceholderText('Peso'), '62');
    fireEvent.changeText(screen.getByPlaceholderText('Altura'), '168');
    fireEvent.press(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(mockedProfileService.saveProfile).toHaveBeenCalledWith({
        nombre: 'Ana',
        fecha_nacimiento: '1998-01-02',
        sexo: 'female',
        nivel_actividad: 'female',
        objetivo: 'female',
        peso: 62,
        altura: 168,
      });
    });
  });

  it('handles missing onboarding draft and backend errors', async () => {
    const OnboardingStep2Screen = require('@/app/(auth)/onboarding/step2').default;
    mockedProfileService.getOnboardingDraft.mockResolvedValueOnce(null);

    const { rerender } = render(<OnboardingStep2Screen />);
    fireEvent.press(screen.getByLabelText('Actividad semanal'));
    fireEvent.press(screen.getByLabelText('Tu objetivo'));
    fireEvent.changeText(screen.getByPlaceholderText('Peso'), '62');
    fireEvent.changeText(screen.getByPlaceholderText('Altura'), '168');
    fireEvent.press(screen.getByText('Enviar'));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding/step1');
    });

    mockedProfileService.getOnboardingDraft.mockResolvedValue({
      nombre: 'Ana',
      sexo: 'female',
      fecha_nacimiento: '1998-01-02',
    });
    mockedProfileService.saveProfile.mockRejectedValue(new ApiError(422, 'Datos no validos'));
    rerender(<OnboardingStep2Screen />);
    fireEvent.press(screen.getByLabelText('Actividad semanal'));
    fireEvent.press(screen.getByLabelText('Tu objetivo'));
    fireEvent.changeText(screen.getByPlaceholderText('Peso'), '62');
    fireEvent.changeText(screen.getByPlaceholderText('Altura'), '168');
    fireEvent.press(screen.getByText('Enviar'));

    expect(await screen.findByText('Datos no validos')).toBeTruthy();
  });

  it('renders onboarding results and clears the draft when accepted', async () => {
    const OnboardingResultsScreen = require('@/app/(auth)/onboarding/results').default;
    mockedProfileService.getProfile.mockResolvedValue({
      email: 'ana@example.com',
      nombre: 'Ana',
      fecha_nacimiento: '1998-01-02',
      sexo: 'female',
      nivel_actividad: 'moderate',
      objetivo: 'maintain',
      peso: 62,
      altura: 168,
      tmb: 1380,
      get: 2139,
      calorias_diarias: 2139,
    });
    mockedProfileService.clearOnboardingDraft.mockResolvedValue();

    render(<OnboardingResultsScreen />);

    expect(await screen.findByText('Actividad moderada')).toBeTruthy();
    expect(screen.getByText('168 cm')).toBeTruthy();
    expect(screen.getByText('62 kg')).toBeTruthy();
    expect(screen.getByText(/Objetivo:/)).toBeTruthy();

    fireEvent.press(screen.getByText('Aceptar'));

    await waitFor(() => {
      expect(mockedProfileService.clearOnboardingDraft).toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/today');
    });
  });

  it('shows onboarding results load errors', async () => {
    const OnboardingResultsScreen = require('@/app/(auth)/onboarding/results').default;
    mockedProfileService.getProfile.mockRejectedValue(new Error('network'));

    render(<OnboardingResultsScreen />);

    expect(await screen.findByText('No se pudieron cargar los resultados')).toBeTruthy();
  });
});
