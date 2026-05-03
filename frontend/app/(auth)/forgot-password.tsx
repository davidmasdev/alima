import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError('El correo es obligatorio');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError('Ingresa un correo válido');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await authService.forgotPassword({ email: normalizedEmail });
      setMessage(response.message);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.detail);
      } else {
        setError('No se pudo enviar el enlace de recuperación');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <FontAwesome name="arrow-left" size={18} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <FontAwesome name="key" size={36} color={Colors.primaryDark} />
            </View>
            <Text style={styles.title}>Recuperar contraseña</Text>
            <Text style={styles.subtitle}>
              Introduce tu correo y te enviaremos un enlace para elegir una nueva contraseña.
            </Text>

            <Input
              label="Correo electrónico"
              placeholder="tu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="envelope-o"
              error={error ?? undefined}
            />

            {message && <Text style={styles.successText}>{message}</Text>}

            <Button
              title="Enviar enlace"
              onPress={handleSubmit}
              loading={isLoading}
              size="large"
              style={styles.actionButton}
            />
            <Button
              title="Ir a iniciar sesión"
              onPress={() => router.replace('/login')}
              variant="secondary"
              size="large"
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundCard,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 12,
  },
  successText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
  },
});
