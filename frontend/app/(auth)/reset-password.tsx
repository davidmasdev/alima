import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AppColors } from '@/constants/Colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  form?: string;
}

export default function ResetPasswordScreen() {
  const { colors, effectiveTheme } = useAppTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!token) {
      nextErrors.form = 'El enlace de recuperación no es válido';
    }

    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 8) {
      nextErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    } else if (password.length > 128) {
      nextErrors.password = 'La contraseña no puede superar 128 caracteres';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await authService.resetPassword({ token, password });
      setMessage(response.message);
      setPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setErrors({ form: caughtError.detail });
      } else {
        setErrors({ form: 'No se pudo actualizar la contraseña' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={effectiveTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <FontAwesome name="lock" size={38} color={colors.primaryDark} />
            </View>
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.subtitle}>
              Elige una contraseña nueva para volver a acceder a tu cuenta.
            </Text>

            <Input
              label="Nueva contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password || errors.form) {
                  setErrors({ ...errors, password: undefined, form: undefined });
                }
              }}
              secureTextEntry
              icon="lock"
              error={errors.password}
            />

            <Input
              label="Confirmar contraseña"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword || errors.form) {
                  setErrors({ ...errors, confirmPassword: undefined, form: undefined });
                }
              }}
              secureTextEntry
              icon="lock"
              error={errors.confirmPassword}
            />

            {errors.form && <Text style={styles.errorText}>{errors.form}</Text>}
            {message && <Text style={styles.successText}>{message}</Text>}

            {!message ? (
              <Button
                title="Guardar contraseña"
                onPress={handleSubmit}
                loading={isLoading}
                size="large"
                style={styles.actionButton}
              />
            ) : (
              <Button
                title="Ir a iniciar sesión"
                onPress={() => router.replace('/login')}
                size="large"
                style={styles.actionButton}
              />
            )}
            {errors.form && (
              <Button
                title="Solicitar otro enlace"
                onPress={() => router.replace('/forgot-password')}
                variant="secondary"
                size="large"
                style={styles.actionButton}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
  },
});
