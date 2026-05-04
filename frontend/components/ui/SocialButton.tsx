import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import type { AppColors } from '@/constants/Colors';
import { useAppTheme } from '@/contexts/ThemeContext';

interface SocialButtonProps {
  provider: 'google';
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

function getProviderConfig(colors: AppColors) {
  return {
  google: {
    icon: 'google',
    color: colors.google,
    bgColor: colors.socialGoogleBackground,
    label: 'Continuar con Google',
  },
  };
}

export function SocialButton({ provider, onPress, disabled = false, style }: SocialButtonProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const config = getProviderConfig(colors)[provider];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, { backgroundColor: config.bgColor }, disabled && styles.disabled, style]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={config.label}
      accessibilityState={{ disabled }}
    >
      <View style={styles.iconContainer}>
        <FontAwesome 
          name={config.icon as any} 
          size={24} 
          color={config.color} 
        />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
