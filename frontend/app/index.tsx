import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de pulso continua
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <LinearGradient
          colors={['rgba(45, 212, 191, 0.15)', 'rgba(129, 140, 248, 0.1)', 'transparent']}
          style={styles.gradientBg}
        />
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.logoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <FontAwesome name="leaf" size={50} color={Colors.textWhite} />
            </LinearGradient>
            <View style={styles.logoRing} />
          </Animated.View>

          <Text style={styles.appName}>App de nutrición</Text>
          <Text style={styles.tagline}>Tu compañero de nutrición personal</Text>
        </Animated.View>

        <Animated.View 
          style={[
            styles.featuresContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
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
        </Animated.View>

        {/* Buttons Section */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.add(slideAnim, new Animated.Value(20)) }],
            },
          ]}
        >
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
        </Animated.View>

        {/* Footer */}
        <Animated.View 
          style={[
            styles.footer,
            { opacity: fadeAnim },
          ]}
        >
          <Text style={styles.footerText}>Al continuar, aceptas nuestros</Text>
          <View style={styles.termsContainer}>
            <Text style={styles.termsLink}>Términos de servicio</Text>
            <Text style={styles.footerText}> y </Text>
            <Text style={styles.termsLink}>Privacidad</Text>
          </View>
        </Animated.View>
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
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(129, 140, 248, 0.06)',
    top: height * 0.3,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(251, 113, 133, 0.06)',
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
