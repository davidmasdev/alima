import React from 'react';
import { Text, Pressable } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider, useAppTheme } from '@/contexts/ThemeContext';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
}));

function ThemeConsumer() {
  const { effectiveTheme, mode, setMode } = useAppTheme();

  return (
    <>
      <Text>mode:{mode}</Text>
      <Text>theme:{effectiveTheme}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="dark" onPress={() => setMode('dark')}>
        <Text>Dark</Text>
      </Pressable>
    </>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('loads the stored theme mode and persists changes', async () => {
    mockStore.set('alima_theme_mode', 'light');

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByText('mode:light')).toBeTruthy());
    expect(screen.getByText('theme:light')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'dark' }));

    await waitFor(() => expect(screen.getByText('mode:dark')).toBeTruthy());
    expect(mockStore.get('alima_theme_mode')).toBe('dark');
  });
});
