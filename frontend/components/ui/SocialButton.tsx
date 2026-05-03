import React from 'react';
import { 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface SocialButtonProps {
  provider: 'apple' | 'google' | 'facebook';
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const providerConfig = {
  apple: {
    icon: 'apple',
    color: Colors.apple,
    bgColor: Colors.socialAppleBackground,
    label: 'Continuar con Apple',
  },
  google: {
    icon: 'google',
    color: Colors.google,
    bgColor: Colors.socialGoogleBackground,
    label: 'Continuar con Google',
  },
  facebook: {
    icon: 'facebook',
    color: Colors.facebook,
    bgColor: Colors.socialFacebookBackground,
    label: 'Continuar con Facebook',
  },
};

export function SocialButton({ provider, onPress, disabled = false, style }: SocialButtonProps) {
  const config = providerConfig[provider];

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

const styles = StyleSheet.create({
  button: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
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
