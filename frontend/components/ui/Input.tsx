import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ViewStyle,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface InputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  style?: ViewStyle;
  icon?: string;
  label?: string;
}

export function Input({
  placeholder,
  value,
  onChangeText,
  onBlur,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  style,
  icon,
  label,
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
    onBlur?.();
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputWrapper,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            error && styles.inputContainerError,
          ]}
        >
          {icon && (
            <FontAwesome
              name={icon as any}
              size={18}
              color={isFocused ? Colors.primary : Colors.textLight}
              style={styles.icon}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.placeholder}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
          />
          {secureTextEntry && (
            <TouchableOpacity
              onPress={togglePasswordVisibility}
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <FontAwesome
                name={isPasswordVisible ? 'eye-slash' : 'eye'}
                size={18}
                color={Colors.textLight}
              />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-circle" size={12} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainerError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    height: '100%',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
    gap: 6,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
});
