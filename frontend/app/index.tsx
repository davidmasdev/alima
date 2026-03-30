import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import LogoSVG from '@/components/ui/LogoSVG';

export default function WelcomeScreen() {
  const handleLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <LogoSVG />
          </View>

          <Text style={styles.appName}>Alima</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Comenzar ahora"
            onPress={handleLogin}
            size="large"
            style={styles.loginButton}
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿Primera vez aquí? </Text>
            <Text style={styles.registerLink} onPress={handleRegister}>
              Crear cuenta
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Al continuar, aceptas nuestros</Text>
          <View style={styles.termsContainer}>
            <Text style={styles.termsLink}>Términos de servicio</Text>
            <Text style={styles.footerText}> y </Text>
            <Text style={styles.termsLink}>Privacidad</Text>
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoSection: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 60,
  },
  loginButton: {
    width: '100%',
    maxWidth: 320,
  },
  registerContainer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
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
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  termsContainer: {
    flexDirection: 'row',
    marginTop: 2,
  },
  termsLink: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
});
