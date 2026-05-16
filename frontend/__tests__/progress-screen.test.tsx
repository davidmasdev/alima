import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/services/api';
import { progressService } from '@/services/progress';
import type { ProgressResponse } from '@/types/progress';

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

jest.mock('react-native-svg', () => {
  const { Text, View } = require('react-native');
  const SvgComponent = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  return {
    __esModule: true,
    default: SvgComponent,
    Circle: () => <View />,
    Line: () => <View />,
    Path: () => <View />,
    Polyline: () => <View />,
    Text: ({ children }: { children?: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('@/contexts/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('@/constants/Colors').lightColors,
    effectiveTheme: 'light',
  }),
}));

jest.mock('@/components/animated/AnimatedModalContent', () => ({
  AnimatedModalContent: ({ children }: { children: React.ReactNode }) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
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

jest.mock('@/services/progress', () => ({
  progressService: {
    getProgress: jest.fn(),
    saveWeight: jest.fn(),
  },
}));

const mockedProgressService = progressService as jest.Mocked<typeof progressService>;

const progressResponse: ProgressResponse = {
  range: 'week',
  objetivo_calorias: 2100,
  summary: {
    rango: 'week',
    fecha_inicio: '2026-05-10',
    fecha_fin: '2026-05-16',
    dias_registrados: 3,
    dias_cumplidos: 2,
    calorias_promedio: 1965.4,
    racha_actual: 2,
  },
  days: [
    {
      fecha: '2026-05-14',
      calorias: 2050,
      objetivo_calorias: 2100,
      registrado: true,
      cumplido: true,
    },
    {
      fecha: '2026-05-15',
      calorias: 2500,
      objetivo_calorias: 2100,
      registrado: true,
      cumplido: false,
    },
    {
      fecha: '2026-05-16',
      calorias: 0,
      objetivo_calorias: 2100,
      registrado: false,
      cumplido: null,
    },
  ],
  calories_series: [
    {
      fecha: '2026-05-14',
      calorias: 2050,
      objetivo_calorias: 2100,
      registrado: true,
      cumplido: true,
    },
    {
      fecha: '2026-05-15',
      calorias: 2500,
      objetivo_calorias: 2100,
      registrado: true,
      cumplido: false,
    },
  ],
  weight_series: [
    { fecha: '2026-05-14', peso: 72.5 },
    { fecha: '2026-05-16', peso: 72.1 },
  ],
};

describe('ProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders progress data and reloads when the selected range changes', async () => {
    const ProgressScreen = require('@/app/(tabs)/progress').default;
    mockedProgressService.getProgress.mockResolvedValue(progressResponse);

    render(<ProgressScreen />);

    expect(await screen.findByText('Grafico de progreso')).toBeTruthy();
    expect(screen.getByText('Calorias y peso')).toBeTruthy();
    expect(screen.getByText('67%')).toBeTruthy();
    expect(screen.getByText('1965')).toBeTruthy();
    expect(screen.getByText('72.1 kg - 16/5')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Ver Mes'));

    await waitFor(() => {
      expect(mockedProgressService.getProgress).toHaveBeenCalledWith('month', expect.any(String));
    });
  });

  it('shows an empty state when there is no progress history', async () => {
    const ProgressScreen = require('@/app/(tabs)/progress').default;
    mockedProgressService.getProgress.mockResolvedValue({
      ...progressResponse,
      summary: {
        ...progressResponse.summary,
        dias_registrados: 0,
        dias_cumplidos: 0,
        calorias_promedio: 0,
        racha_actual: 0,
      },
      days: [],
      calories_series: [],
      weight_series: [],
    });

    render(<ProgressScreen />);

    expect(await screen.findByText('Empieza tu historial')).toBeTruthy();
    expect(screen.getByText('Sin registros de peso')).toBeTruthy();
  });

  it('validates and saves the current weight', async () => {
    const ProgressScreen = require('@/app/(tabs)/progress').default;
    mockedProgressService.getProgress.mockResolvedValue(progressResponse);
    mockedProgressService.saveWeight.mockResolvedValue({
      ...progressResponse,
      weight_series: [...progressResponse.weight_series, { fecha: '2026-05-17', peso: 71.8 }],
    });

    render(<ProgressScreen />);

    await screen.findByText('Grafico de progreso');
    fireEvent.press(screen.getByLabelText('Actualizar peso'));
    fireEvent.changeText(screen.getByPlaceholderText('Peso'), '');
    fireEvent.press(screen.getByText('Guardar'));

    expect(await screen.findByText('Ingresa un peso valido')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Peso'), '71.8');
    fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(mockedProgressService.saveWeight).toHaveBeenCalledWith(
        { peso: 71.8 },
        'week',
        expect.any(String),
      );
    });
  });

  it('shows load and save errors', async () => {
    const ProgressScreen = require('@/app/(tabs)/progress').default;
    mockedProgressService.getProgress.mockRejectedValueOnce(new Error('network'));

    const { unmount } = render(<ProgressScreen />);

    expect(await screen.findByText('No se pudo cargar el progreso')).toBeTruthy();
    unmount();

    mockedProgressService.getProgress.mockResolvedValue(progressResponse);
    mockedProgressService.saveWeight.mockRejectedValue(new ApiError(422, 'Peso fuera de rango'));

    render(<ProgressScreen />);

    await screen.findByText('Grafico de progreso');
    fireEvent.press(screen.getByLabelText('Actualizar peso'));
    fireEvent.changeText(screen.getByPlaceholderText('Peso'), '500');
    fireEvent.press(screen.getByText('Guardar'));

    expect(await screen.findByText('Peso fuera de rango')).toBeTruthy();
  });
});
