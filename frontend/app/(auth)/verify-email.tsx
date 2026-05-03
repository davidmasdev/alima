import React, { useMemo, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AppColors } from '@/constants/Colors';
import { useAppTheme } from '@/contexts/ThemeContext';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';

export default function VerifyEmailScreen() {
  const { colors, effectiveTheme } = useAppTheme();
  const styles = createStyles(colors);
  const params = useLocalSearchParams<{ status?: string }>();
  const status = typeof params.status === 'string' ? params.status : 'invalid';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const content = useMemo(() => {
    if (status === 'success') {
      return {
        icon: 'check-circle' as const,
        title: 'Cuenta validada',
        text: 'Tu cuenta ya esta activa. Ya puedes iniciar sesion.',
      };
    }
    if (status === 'expired') {
      return {
        icon: 'clock-o' as const,
        title: 'Enlace caducado',
        text: 'El enlace ha caducado. Solicita un nuevo correo de validacion.',
      };
    }
    return {
      icon: 'exclamation-circle' as const,
      title: 'Enlace no valido',
      text: 'No hemos podido validar este enlace. Puedes solicitar un nuevo correo.',
    };
  }, [status]);

  const handleResend = async () => {
    if (!email.trim()) {
      setError('Introduce tu correo');
      return;
    }

    setIsResending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await authService.resendVerification({ email: email.trim() });
      setMessage(response.message);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError('No se pudo reenviar el correo');
      }
    } finally {
      setIsResending(false);
    }
  };

  const needsResend = status !== 'success';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={effectiveTheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <FontAwesome name={content.icon} size={42} color={colors.primaryDark} />
        </View>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.text}>{content.text}</Text>

        {needsResend && (
          <View style={styles.resendBox}>
            <Input
              label="Correo electronico"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="envelope-o"
              error={error ?? undefined}
            />
            {message && <Text style={styles.successText}>{message}</Text>}
            <Button
              title="Reenviar correo"
              onPress={handleResend}
              loading={isResending}
              size="large"
              style={styles.actionButton}
            />
          </View>
        )}

        <Button
          title="Ir a iniciar sesion"
          onPress={() => router.replace('/login')}
          variant={needsResend ? 'secondary' : 'primary'}
          size="large"
          style={styles.actionButton}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 18,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 8,
  },
  resendBox: {
    width: '100%',
    gap: 14,
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
