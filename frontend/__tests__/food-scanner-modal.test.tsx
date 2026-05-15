import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { FoodScannerModal } from '@/components/FoodScannerModal';
import { ApiError } from '@/services/api';
import { dailyLogService } from '@/services/dailyLog';

let mockPermission: { granted: boolean } | null = null;
const mockRequestPermission = jest.fn();

jest.mock('expo-camera', () => ({
  CameraView: ({ onBarcodeScanned }: { onBarcodeScanned?: (result: { data: string }) => void }) => {
    const { Pressable: MockPressable, Text: MockText } = require('react-native');
    return (
      <MockPressable
        accessibilityRole="button"
        accessibilityLabel="mock-camera"
        testID="mock-camera"
        onPress={() => onBarcodeScanned?.({ data: '8412345678901' })}
      >
        <MockText>Camera</MockText>
      </MockPressable>
    );
  },
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}));

jest.mock('@expo/vector-icons', () => ({
  FontAwesome: () => {
    const { View: MockView } = require('react-native');
    return <MockView />;
  },
}));

jest.mock('@/components/animated/AnimatedModalContent', () => ({
  AnimatedModalContent: ({ children }: { children: React.ReactNode }) => {
    const { View: MockView } = require('react-native');
    return <MockView>{children}</MockView>;
  },
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('@/constants/Colors').lightColors,
    effectiveTheme: 'light',
    mode: 'light',
    setMode: jest.fn(),
  }),
}));

jest.mock('@/services/dailyLog', () => ({
  dailyLogService: {
    scanFood: jest.fn(),
  },
}));

const mockedScanFood = dailyLogService.scanFood as jest.MockedFunction<typeof dailyLogService.scanFood>;

const food = {
  id: 'food-1',
  nombre: 'Yogur',
  calorias: 120,
  proteinas: 8,
  carbohidratos: 12,
  grasas: 3,
};

describe('FoodScannerModal', () => {
  beforeEach(() => {
    mockPermission = null;
    mockRequestPermission.mockReset();
    mockedScanFood.mockReset();
  });

  it('shows a permission request when camera access is not granted', () => {
    mockPermission = { granted: false };

    render(
      <FoodScannerModal visible onClose={jest.fn()} onFoodScanned={jest.fn()} />,
    );

    fireEvent.press(screen.getByRole('button', { name: /Permitir/ }));
    expect(screen.getByText(/Necesitamos acceso/)).toBeTruthy();
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('resolves a scanned barcode and notifies the parent component', async () => {
    mockPermission = { granted: true };
    mockedScanFood.mockResolvedValue(food as never);
    const onFoodScanned = jest.fn();

    render(
      <FoodScannerModal visible onClose={jest.fn()} onFoodScanned={onFoodScanned} />,
    );

    fireEvent.press(screen.getByTestId('mock-camera'));

    await waitFor(() => {
      expect(mockedScanFood).toHaveBeenCalledWith('8412345678901');
      expect(onFoodScanned).toHaveBeenCalledWith(food);
    });
  });

  it('renders API errors returned by the scan endpoint', async () => {
    mockPermission = { granted: true };
    mockedScanFood.mockRejectedValue(new ApiError(404, 'Producto no encontrado'));

    render(
      <FoodScannerModal visible onClose={jest.fn()} onFoodScanned={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId('mock-camera'));

    await waitFor(() => {
      expect(screen.getByText('Producto no encontrado')).toBeTruthy();
    });
  });
});
