import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { FontAwesome } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SocialButton } from '@/components/ui/SocialButton';
import { Colors } from '@/constants/Colors';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';
import { redirectAfterAuthenticatedSession } from '@/services/oauth';

WebBrowser.maybeCompleteAuthSession();


interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    const completeGoogleLogin = async () => {
      if (googleResponse?.type !== 'success') return;

      const idToken = googleResponse.params.id_token;
      if (!idToken) {
        setErrors({ form: 'Google no devolvió una sesión válida' });
        setIsSocialLoading(false);
        return;
      }

      try {
        await authService.googleOAuth({ id_token: idToken });
        await redirectAfterAuthenticatedSession();
      } catch (error) {
        if (error instanceof ApiError) {
          setErrors({ form: error.detail });
        } else {
          setErrors({ form: 'No se pudo iniciar sesión con Google' });
        }
      } finally {
        setIsSocialLoading(false);
      }
    };

    completeGoogleLogin();
  }, [googleResponse]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Ingresa un correo válido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setResendMessage(null);

    try {
      await authService.login({
        email: email.trim(),
        password,
      });
      await redirectAfterAuthenticatedSession();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setErrors({ password: 'Credenciales incorrectas' });
        } else if (error.status === 403) {
          setErrors({ form: 'Valida tu correo antes de iniciar sesión' });
        } else {
          setErrors({ email: error.detail });
        }
      } else {
        setErrors({ email: 'No se pudo iniciar sesión' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !validateEmail(normalizedEmail)) {
      setErrors({ email: 'Introduce un correo válido para reenviar la validación' });
      return;
    }

    setIsResending(true);
    setResendMessage(null);

    try {
      const response = await authService.resendVerification({ email: normalizedEmail });
      setResendMessage(response.message);
    } catch (error) {
      if (error instanceof ApiError) {
        setResendMessage(error.detail);
      } else {
        setResendMessage('No se pudo reenviar el correo de validación');
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleRegister = async () => {
      router.replace('/register');
  };

  const handleSocialLogin = async (provider: 'apple' | 'google' | 'facebook') => {
    if (provider !== 'google') {
      setErrors({ form: 'Este inicio de sesión estará disponible próximamente' });
      return;
    }

    if (!googleRequest) {
      setErrors({ form: 'El inicio con Google no está configurado' });
      return;
    }

    setErrors({});
    setIsSocialLoading(true);
    const result = await promptGoogleAsync();
    if (result.type !== 'success') {
      setIsSocialLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <View style={styles.headerBackground} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <View style={styles.backButtonCircle}>
                <FontAwesome name="arrow-left" size={18} color={Colors.text} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.greeting}>Inicio de sesión</Text>
            <Text style={styles.subtitle}>
              Ingresa tus datos para continuar
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Correo electrónico"
              placeholder="tu@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors({ ...errors, email: undefined });
                }
              }}
              onBlur={() => {
                if (email && !validateEmail(email)) {
                  setErrors({ ...errors, email: 'Ingresa un correo válido' });
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              icon="envelope-o"
            />

            <Input
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) {
                  setErrors({ ...errors, password: undefined });
                }
              }}
              secureTextEntry
              error={errors.password}
              icon="lock"
            />

            <TouchableOpacity 
              onPress={handleForgotPassword}
              style={styles.forgotPasswordContainer}
              accessibilityRole="button"
              accessibilityLabel="Recuperar contraseña"
            >
              <Text style={styles.forgotPasswordText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            <Button
              title="Iniciar sesión"
              onPress={handleLogin}
              loading={isLoading}
              size="large"
              style={styles.loginButton}
            />
            {errors.form && (
              <View style={styles.formMessageContainer}>
                <Text style={styles.formErrorText}>{errors.form}</Text>
                <Button
                  title="Reenviar correo"
                  onPress={handleResendVerification}
                  loading={isResending}
                  variant="secondary"
                  size="medium"
                />
                {resendMessage && (
                  <Text style={styles.resendMessageText}>{resendMessage}</Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O continúa con</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialContainer}>
            <SocialButton
              provider="apple"
              onPress={() => handleSocialLogin('apple')}
            />
            <SocialButton
              provider="google"
              onPress={() => handleSocialLogin('google')}
              disabled={isSocialLoading}
            />
            <SocialButton
              provider="facebook"
              onPress={() => handleSocialLogin('facebook')}
            />
          </View>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity
              onPress={handleRegister}
              accessibilityRole="button"
              accessibilityLabel="Ir a registro"
            >
              <Text style={styles.registerLink}>Regístrate</Text>
            </TouchableOpacity>
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
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: Colors.backgroundCard,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonCircle: {
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
  titleSection: {
    marginBottom: 40,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
    gap: 20,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  loginButton: {
    width: '100%',
    marginTop: 8,
  },
  formErrorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  formMessageContainer: {
    gap: 12,
  },
  resendMessageText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 14,
    color: Colors.textLight,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  registerText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  registerLink: {
    fontSize: 15,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});
