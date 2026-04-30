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
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { NumberInput } from '@/components/ui/NumberInput';
import { Colors } from '@/constants/Colors';

interface FormErrors {
  activity?: string;
  goal?: string;
  weight?: string;
  height?: string;
}

const activityOptions = [
  { 
    value: 'sedentary', 
    label: 'Sedentario', 
    description: 'Poco o ningún ejercicio' 
  },
  { 
    value: 'light', 
    label: 'Actividad ligera', 
    description: 'Ejercicio 1-3 días por semana' 
  },
  { 
    value: 'moderate', 
    label: 'Actividad moderada', 
    description: 'Ejercicio 3-5 días por semana' 
  },
  { 
    value: 'active', 
    label: 'Activo', 
    description: 'Ejercicio 6-7 días por semana' 
  },
  { 
    value: 'very_active', 
    label: 'Muy Activo', 
    description: 'Ejercicio intenso diario o trabajo físico' 
  },
];

const goalOptions = [
  { value: 'maintain', label: 'Mantener peso' },
  { value: 'lose', label: 'Perder peso' },
  { value: 'gain', label: 'Ganar peso' },
];

export default function OnboardingStep2Screen() {
  const [activity, setActivity] = useState('');
  const [goal, setGoal] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!activity) {
      newErrors.activity = 'Selecciona tu nivel de actividad';
    }

    if (!goal) {
      newErrors.goal = 'Selecciona tu objetivo';
    }

    if (!weight.trim()) {
      newErrors.weight = 'Ingresa tu peso';
    } else if (isNaN(Number(weight)) || Number(weight) <= 0) {
      newErrors.weight = 'Ingresa un peso válido';
    }

    if (!height.trim()) {
      newErrors.height = 'Ingresa tu altura';
    } else if (isNaN(Number(height)) || Number(height) <= 0) {
      newErrors.height = 'Ingresa una altura válida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/(tabs)/today');
    }, 1500);
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
            <Text style={styles.title}>Tu información</Text>
            <Text style={styles.subtitle}>
              Paso 2 de 2
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
          </View>

          <View style={styles.formContainer}>
            <Select
              label="Actividad semanal"
              placeholder="Selecciona tu actividad"
              value={activity}
              onSelect={(value) => {
                setActivity(value);
                if (errors.activity) {
                  setErrors({ ...errors, activity: undefined });
                }
              }}
              options={activityOptions}
              error={errors.activity}
            />

            <Select
              label="Tu objetivo"
              placeholder="Selecciona tu objetivo"
              value={goal}
              onSelect={(value) => {
                setGoal(value);
                if (errors.goal) {
                  setErrors({ ...errors, goal: undefined });
                }
              }}
              options={goalOptions}
              error={errors.goal}
            />

            <NumberInput
              label="Peso"
              placeholder="0"
              value={weight}
              onChangeText={(text) => {
                setWeight(text);
                if (errors.weight) {
                  setErrors({ ...errors, weight: undefined });
                }
              }}
              unit="kg"
              error={errors.weight}
              keyboardType="decimal-pad"
            />

            <NumberInput
              label="Altura"
              placeholder="0"
              value={height}
              onChangeText={(text) => {
                setHeight(text);
                if (errors.height) {
                  setErrors({ ...errors, height: undefined });
                }
              }}
              unit="cm"
              error={errors.height}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Enviar"
              onPress={handleSubmit}
              loading={isLoading}
              size="large"
              style={styles.submitButton}
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
    marginBottom: 20,
  },
  title: {
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
  progressContainer: {
    marginBottom: 40,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  formContainer: {
    width: '100%',
    gap: 24,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 40,
  },
  submitButton: {
    width: '100%',
  },
});
