import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import LogoSVG from '@/components/ui/LogoSVG';

const { height } = Dimensions.get('window');

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
      
      <View style={styles.backgroundDecorations}>
        <View style={styles.solidBg} />
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <LogoSVG />
            <View style={styles.logoRing} />
          </View>

          <Text style={styles.appName}>Alima</Text>
          <Text style={styles.tagline}>Tu compañero de nutrición personal</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.successLight }]}>
              <FontAwesome name="heart" size={16} color={Colors.success} />
            </View>
            <Text style={styles.featureText}>Saludable</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: Colors.primaryMuted }]}>
              <FontAwesome name="line-chart" size={16} color={Colors.primaryDark} />
            </View>
            <Text style={styles.featureText}>Progreso</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(251, 113, 133, 0.1)' }]}>
              <FontAwesome name="key" size={16} color={Colors.secondary} />
            </View>
            <Text style={styles.featureText}>IA</Text>
          </View>
        </View>

        {/* Buttons Section */}
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

        {/* Footer */}
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
  backgroundDecorations: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  solidBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: Colors.backgroundCard,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    top: height * 0.3,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    bottom: height * 0.25,
    right: 30,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  logoGradient: {
    width: 130,
    height: 130,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: 'rgba(45, 212, 191, 0.3)',
    top: -10,
    left: -10,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 50,
    marginBottom: 40,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
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
    marginTop: 30,
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
