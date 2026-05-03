import React, { useState } from 'react';
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
import { FontAwesome } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SocialButton } from '@/components/ui/SocialButton';
import { Colors } from '@/constants/Colors';
import { ApiError } from '@/services/api';
import { authService } from '@/services/auth';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await authService.register({
        email: email.trim(),
        password,
      });
      router.push({
        pathname: '/verify-email-sent',
        params: { email: email.trim() },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setErrors({ email: 'Ya existe una cuenta con este correo' });
        } else {
          setErrors({ email: error.detail });
        }
      } else {
        setErrors({ email: 'No se pudo crear la cuenta' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (_provider: 'apple' | 'google' | 'facebook') => {
    setErrors({ email: 'El registro con redes sociales aún no está disponible' });
  };

  const handleLogin = () => {
    router.replace('/login');
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
            <Text style={styles.greeting}>Crear cuenta</Text>
            <Text style={styles.subtitle}>
              Regístrate para comenzar tu viaje
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

            <Input
              label="Confirmar contraseña"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: undefined });
                }
              }}
              secureTextEntry
              error={errors.confirmPassword}
              icon="lock"
            />

            <Button
              title="Registrarse"
              onPress={handleRegister}
              loading={isLoading}
              size="large"
              style={styles.registerButton}
            />
          </View>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O regístrate con</Text>
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
            />
            <SocialButton
              provider="facebook"
              onPress={() => handleSocialLogin('facebook')}
            />
          </View>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
            <TouchableOpacity
              onPress={handleLogin}
              accessibilityRole="button"
              accessibilityLabel="Ir a inicio de sesión"
            >
              <Text style={styles.loginLink}>Iniciar sesión</Text>
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
  registerButton: {
    width: '100%',
    marginTop: 8,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loginText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 15,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
});
