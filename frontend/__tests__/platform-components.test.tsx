import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DatePicker } from '@/components/ui/DatePicker';
import { NumberInput } from '@/components/ui/NumberInput';
import { Select } from '@/components/ui/Select';
import { SocialButton } from '@/components/ui/SocialButton';

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockDateTimePicker() {
    return <Text>Native date picker</Text>;
  };
});

jest.mock('@expo/vector-icons', () => ({
  FontAwesome: ({ name }: { name: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return <Text>{name}</Text>;
  },
}));

jest.mock('@/components/animated/AnimatedModalContent', () => ({
  AnimatedModalContent: ({ children }: any) => children,
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('@/constants/Colors').lightColors,
    effectiveTheme: 'light',
  }),
}));

function setPlatform(os: 'android' | 'ios' | 'web') {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

describe('platform specific frontend components', () => {
  afterEach(() => {
    setPlatform('ios');
  });

  it('renders Android and iOS date picker branches', () => {
    const onSelect = jest.fn();

    setPlatform('android');
    const android = render(
      <DatePicker placeholder="Selecciona" label="Fecha" value={null} onSelect={onSelect} />,
    );
    fireEvent.press(android.getByLabelText('Fecha'));
    expect(android.getByText('Native date picker')).toBeTruthy();
    android.unmount();

    setPlatform('ios');
    render(<DatePicker placeholder="Selecciona" label="Fecha" value={null} onSelect={onSelect} />);
    fireEvent.press(screen.getByLabelText('Fecha'));
    expect(screen.getByText('Confirmar')).toBeTruthy();
    fireEvent.press(screen.getByText('Confirmar'));
    expect(onSelect).toHaveBeenCalled();
  });

  it('renders select options and propagates selected values', () => {
    const onSelect = jest.fn();
    render(
      <Select
        label="Actividad"
        placeholder="Selecciona actividad"
        value=""
        onSelect={onSelect}
        options={[
          { value: 'light', label: 'Ligera', description: '1-3 dias' },
          { value: 'active', label: 'Activa' },
        ]}
      />,
    );

    fireEvent.press(screen.getByLabelText('Actividad'));
    fireEvent.press(screen.getByText('Ligera'));

    expect(onSelect).toHaveBeenCalledWith('light');
  });

  it('handles number input focus, blur, errors and social button presses', () => {
    const onChangeText = jest.fn();
    const onBlur = jest.fn();
    const onPress = jest.fn();

    render(
      <>
        <NumberInput
          label="Peso"
          placeholder="0"
          value="62"
          onChangeText={onChangeText}
          onBlur={onBlur}
          unit="kg"
          error="Peso invalido"
        />
        <SocialButton provider="google" onPress={onPress} />
      </>,
    );

    const input = screen.getByDisplayValue('62');
    fireEvent(input, 'focus');
    fireEvent.changeText(input, '63');
    fireEvent(input, 'blur');
    fireEvent.press(screen.getByLabelText('Continuar con Google'));

    expect(screen.getByText('Peso invalido')).toBeTruthy();
    expect(onChangeText).toHaveBeenCalledWith('63');
    expect(onBlur).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalled();
  });
});
