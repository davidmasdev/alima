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
  style?: ViewStyle;
}

const providerConfig = {
  apple: {
    icon: 'apple',
    color: Colors.apple,
    bgColor: '#F3F4F6',
  },
  google: {
    icon: 'google',
    color: Colors.google,
    bgColor: '#FEF2F2',
  },
  facebook: {
    icon: 'facebook',
    color: Colors.facebook,
    bgColor: '#EFF6FF',
  },
};

export function SocialButton({ provider, onPress, style }: SocialButtonProps) {
  const config = providerConfig[provider];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, { backgroundColor: config.bgColor }, style]}
      activeOpacity={0.8}
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
});
