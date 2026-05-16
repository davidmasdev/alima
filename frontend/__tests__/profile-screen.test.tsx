import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';
import { dailyLogService } from '@/services/dailyLog';
import { profileService } from '@/services/profile';
import type { MealType } from '@/types/dailyLog';
import type { Profile } from '@/types/profile';

const mockRouter = {
  replace: jest.fn(),
};
const mockSetMode = jest.fn();

jest.mock('expo-router', () => ({
  router: mockRouter,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  FontAwesome: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('@/constants/Colors').lightColors,
    effectiveTheme: 'light',
    mode: 'system',
    setMode: mockSetMode,
  }),
}));

jest.mock('@/components/animated/AnimatedModalContent', () => ({
  AnimatedModalContent: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ title, onPress, loading }: any) => {
    const { Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={loading}>
        <Text>{loading ? 'Cargando' : title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@/components/ui/Input', () => ({
  Input: ({ label, value, onChangeText, error }: any) => {
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

jest.mock('@/components/ui/Select', () => ({
  Select: ({ label, onSelect, error }: any) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    const valueByLabel: Record<string, string> = {
      'Actividad semanal': 'moderate',
      'Tu objetivo': 'lose',
    };
    const selectedValue = label.includes('nero') ? 'female' : valueByLabel[label] ?? 'female';
    return (
      <>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => onSelect(selectedValue)}
        >
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
          onPress={() => onSelect(new Date('1995-06-10T00:00:00.000Z'))}
        >
          <Text>{label}</Text>
        </TouchableOpacity>
        {error ? <Text>{error}</Text> : null}
      </>
    );
  },
}));

jest.mock('@/services/auth', () => ({
  authService: {
    clearSession: jest.fn(),
  },
}));

jest.mock('@/services/dailyLog', () => ({
  dailyLogService: {
    getMealTypes: jest.fn(),
    updateMealTypes: jest.fn(),
  },
}));

jest.mock('@/services/profile', () => ({
  profileService: {
    deleteAccount: jest.fn(),
    getProfile: jest.fn(),
    saveProfile: jest.fn(),
  },
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const mockedDailyLogService = dailyLogService as jest.Mocked<typeof dailyLogService>;
const mockedProfileService = profileService as jest.Mocked<typeof profileService>;

const completeProfile: Profile = {
  email: 'ana@example.com',
  nombre: 'Ana',
  fecha_nacimiento: '1995-06-10',
  sexo: 'female',
  nivel_actividad: 'moderate',
  objetivo: 'maintain',
  peso: 62,
  altura: 168,
  tmb: 1380,
  get: 2139,
  calorias_diarias: 2139,
};

const mealTypes: MealType[] = [
  { id: '1', nombre: 'Desayuno', orden: 1 },
  { id: '2', nombre: 'Comida', orden: 2 },
  { id: '3', nombre: 'Cena', orden: 3 },
];

function renderProfileScreen() {
  const ProfileScreen = require('@/app/(tabs)/profile').default;
  return render(<ProfileScreen />);
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedProfileService.getProfile.mockResolvedValue(completeProfile);
    mockedDailyLogService.getMealTypes.mockResolvedValue(mealTypes);
  });

  it('renders profile data, meal types and changes the visual mode', async () => {
    renderProfileScreen();

    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    expect(screen.getByText('Actividad moderada')).toBeTruthy();
    expect(screen.getByText('62 kg')).toBeTruthy();
    expect(screen.getByText('2139 kcal')).toBeTruthy();
    expect(screen.getByText('Desayuno, Comida, Cena')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Usar tema Oscuro'));

    expect(mockSetMode).toHaveBeenCalledWith('dark');
  });

  it('validates and saves profile edits', async () => {
    mockedProfileService.saveProfile.mockResolvedValue({
      ...completeProfile,
      nombre: 'Ana Maria',
      objetivo: 'lose',
    });

    renderProfileScreen();

    await screen.findByText('Ana');
    fireEvent.press(screen.getByText('Editar'));
    fireEvent.changeText(screen.getByPlaceholderText('Nombre'), '');
    fireEvent.changeText(screen.getByPlaceholderText('Peso'), '');
    fireEvent.changeText(screen.getByPlaceholderText('Altura'), '');
    fireEvent.press(screen.getByLabelText('Guardar perfil'));

    expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();
    expect(screen.getByText('Ingresa un peso válido')).toBeTruthy();
    expect(screen.getByText('Ingresa una altura válida')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Nombre'), ' Ana Maria ');
    fireEvent.press(screen.getByLabelText(/nero/));
    fireEvent.press(screen.getByLabelText('Fecha de nacimiento'));
    fireEvent.press(screen.getByLabelText('Actividad semanal'));
    fireEvent.press(screen.getByLabelText('Tu objetivo'));
    fireEvent.changeText(screen.getByPlaceholderText('Peso'), '61');
    fireEvent.changeText(screen.getByPlaceholderText('Altura'), '167');
    fireEvent.press(screen.getByLabelText('Guardar perfil'));

    await waitFor(() => {
      expect(mockedProfileService.saveProfile).toHaveBeenCalledWith({
        nombre: 'Ana Maria',
        fecha_nacimiento: '1995-06-10',
        sexo: 'female',
        nivel_actividad: 'moderate',
        objetivo: 'lose',
        peso: 61,
        altura: 167,
      });
    });
  });

  it('shows backend errors while saving profile edits', async () => {
    mockedProfileService.saveProfile.mockRejectedValue(new ApiError(422, 'Perfil invalido'));

    renderProfileScreen();

    await screen.findByText('Ana');
    fireEvent.press(screen.getByText('Editar'));
    fireEvent.press(screen.getByLabelText('Guardar perfil'));

    expect(await screen.findByText('Perfil invalido')).toBeTruthy();
  });

  it('edits meal types and validates duplicated names', async () => {
    mockedDailyLogService.updateMealTypes.mockResolvedValue([
      { id: '1', nombre: 'Desayuno', orden: 1 },
      { id: '2', nombre: 'Merienda', orden: 2 },
    ]);

    renderProfileScreen();

    await screen.findByText('Desayuno, Comida, Cena');
    fireEvent.press(screen.getByText('Configurar comidas'));
    fireEvent.changeText(screen.getByPlaceholderText('Comida 2'), 'Desayuno');
    fireEvent.press(screen.getByLabelText('Guardar tipos de comida'));

    expect(await screen.findByText('No repitas nombres de comidas')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Comida 2'), 'Merienda');
    fireEvent.press(screen.getByLabelText('Bajar comida 1'));
    fireEvent.press(screen.getByLabelText('Subir comida 2'));
    fireEvent.press(screen.getByLabelText('Eliminar comida 3'));
    fireEvent.press(screen.getByLabelText('Añadir comida'));
    fireEvent.changeText(screen.getByPlaceholderText('Comida 3'), 'Cena');
    fireEvent.press(screen.getByLabelText('Guardar tipos de comida'));

    await waitFor(() => {
      expect(mockedDailyLogService.updateMealTypes).toHaveBeenCalledWith([
        'Desayuno',
        'Merienda',
        'Cena',
      ]);
    });
  });

  it('logs out and confirms account deletion', async () => {
    mockedAuthService.clearSession.mockResolvedValue();
    mockedProfileService.deleteAccount.mockResolvedValue();

    renderProfileScreen();

    await screen.findByText('Ana');
    fireEvent.press(screen.getByText('Cerrar sesión'));

    await waitFor(() => {
      expect(mockedAuthService.clearSession).toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });

    fireEvent.press(screen.getByLabelText('Eliminar cuenta'));
    fireEvent.press(screen.getByLabelText('Cancelar eliminación de cuenta'));
    fireEvent.press(screen.getByLabelText('Eliminar cuenta'));
    fireEvent.press(screen.getByLabelText('Confirmar eliminación de cuenta'));

    await waitFor(() => {
      expect(mockedProfileService.deleteAccount).toHaveBeenCalled();
    });
  });

  it('shows load errors and incomplete profile state', async () => {
    mockedProfileService.getProfile.mockRejectedValueOnce(new Error('network'));

    const { unmount } = renderProfileScreen();

    expect(await screen.findByText('No se pudo cargar el perfil')).toBeTruthy();
    unmount();

    mockedProfileService.getProfile.mockResolvedValue({
      ...completeProfile,
      nombre: null,
      peso: null,
      calorias_diarias: null,
    });
    mockedDailyLogService.getMealTypes.mockResolvedValue([]);

    renderProfileScreen();

    expect(await screen.findByText('Completa tu perfil para ver todos tus datos nutricionales.')).toBeTruthy();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
  });
});
