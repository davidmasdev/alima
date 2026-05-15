import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

jest.mock('@/contexts/ThemeContext', () => ({
  useAppTheme: () => ({
    colors: require('@/constants/Colors').lightColors,
    effectiveTheme: 'light',
    mode: 'light',
    setMode: jest.fn(),
  }),
}));

jest.mock('@/components/animated/AnimatedPressable', () => ({
  AnimatedPressable: ({ children, ...props }: { children: React.ReactNode }) => {
    const { Pressable: MockPressable } = require('react-native');
    return <MockPressable {...props}>{children}</MockPressable>;
  },
}));

jest.mock('@expo/vector-icons', () => ({
  FontAwesome: () => {
    const { View: MockView } = require('react-native');
    return <MockView />;
  },
}));

describe('UI components', () => {
  it('renders an enabled button and handles presses', () => {
    const onPress = jest.fn();

    render(<Button title="Guardar" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText('Guardar')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disables button interaction while loading', () => {
    const onPress = jest.fn();

    render(<Button title="Guardar" onPress={onPress} loading />);
    const button = screen.getByRole('button', { name: 'Guardar' });

    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders input labels, errors and propagates text changes', () => {
    const onChangeText = jest.fn();

    render(
      <Input
        label="Correo"
        placeholder="correo@example.com"
        value=""
        onChangeText={onChangeText}
        error="Campo obligatorio"
      />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('correo@example.com'), 'ana@example.com');

    expect(screen.getByText('Correo')).toBeTruthy();
    expect(screen.getByText('Campo obligatorio')).toBeTruthy();
    expect(onChangeText).toHaveBeenCalledWith('ana@example.com');
  });

  it('toggles password visibility', () => {
    render(
      <Input
        placeholder="Contrasena"
        value="secret123"
        onChangeText={jest.fn()}
        secureTextEntry
      />,
    );

    const input = screen.getByPlaceholderText('Contrasena');
    expect(input.props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: /Mostrar/ }));
    expect(screen.getByPlaceholderText('Contrasena').props.secureTextEntry).toBe(false);
  });
});
