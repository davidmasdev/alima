import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
} from 'react-native';
import { Colors } from '@/constants/Colors';

interface NumberInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  unit: string;
  error?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
}

export function NumberInput({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  unit,
  error,
  keyboardType = 'numeric',
}: NumberInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

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
    <View style={styles.container}>
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
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.placeholder}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType={keyboardType}
          />
          <View style={styles.unitContainer}>
            <Text style={styles.unitText}>{unit}</Text>
          </View>
        </View>
      </Animated.View>

      {error && (
        <View style={styles.errorContainer}>
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
    paddingLeft: 16,
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
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    height: '100%',
    fontWeight: '500',
  },
  unitContainer: {
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  errorContainer: {
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
});
