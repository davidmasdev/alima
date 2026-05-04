import React from 'react';
import { 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle,
  View 
} from 'react-native';
import { AnimatedPressable } from '@/components/animated/AnimatedPressable';
import type { AppColors } from '@/constants/Colors';
import { useAppTheme } from '@/contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'large':
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };

  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.buttonContainer, style]}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
      >
        <View
          style={[
            styles.primaryButton,
            getSizeStyle(),
            (disabled || loading) && styles.disabledButton,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textWhite} />
          ) : (
            <View style={styles.contentContainer}>
              {icon}
              <Text style={[styles.buttonText, getTextSize(), textStyle]}>
                {title}
              </Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  }

  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'ghost':
        return styles.ghostButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      case 'ghost':
        return styles.ghostText;
      case 'secondary':
        return styles.secondaryText;
      default:
        return styles.buttonText;
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        getButtonStyle(),
        getSizeStyle(),
        (disabled || loading) && styles.disabledButton,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textWhite}
        />
      ) : (
        <View style={styles.contentContainer}>
          {icon}
          <Text style={[getTextStyle(), getTextSize(), textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  buttonContainer: {
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  button: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  mediumButton: {
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  largeButton: {
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.textWhite,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryText: {
    color: colors.textWhite,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outlineText: {
    color: colors.text,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  ghostText: {
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
});
