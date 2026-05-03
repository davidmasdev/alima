import React, { useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';

export default function VerifyEmailSentScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) return;

    setIsResending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await authService.resendVerification({ email });
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <FontAwesome name="envelope-o" size={38} color={Colors.primaryDark} />
        </View>
        <Text style={styles.title}>Revisa tu correo</Text>
        <Text style={styles.text}>
          Hemos enviado un enlace de validacion a {email || 'tu correo'}. El enlace caduca en 24 horas.
        </Text>

        {isResending && <ActivityIndicator color={Colors.primary} />}
        {message && <Text style={styles.successText}>{message}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          title="Reenviar correo"
          onPress={handleResend}
          loading={isResending}
          disabled={!email}
          size="large"
          style={styles.actionButton}
        />
        <Button
          title="Ir a iniciar sesion"
          onPress={() => router.replace('/login')}
          variant="secondary"
          size="large"
          style={styles.actionButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 18,
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  text: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
  },
});
