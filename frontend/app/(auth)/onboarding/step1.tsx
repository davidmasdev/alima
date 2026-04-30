import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Colors } from '@/constants/Colors';

interface FormErrors {
  name?: string;
  gender?: string;
  birthDate?: string;
}

const genderOptions = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' },
  { value: 'prefer_not_to_say', label: 'Prefiero no decirlo' },
];

export default function OnboardingStep1Screen() {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (!gender) {
      newErrors.gender = 'Selecciona tu género';
    }

    if (!birthDate) {
      newErrors.birthDate = 'Selecciona tu fecha de nacimiento';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;
    router.push('/onboarding/step2');
  };

  const maxDate = new Date();
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

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
          <View style={styles.titleSection}>
            <Text style={styles.title}>Tu información</Text>
            <Text style={styles.subtitle}>
              Paso 1 de 2
            </Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
          </View>

          <View style={styles.formContainer}>
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) {
                  setErrors({ ...errors, name: undefined });
                }
              }}
              autoCapitalize="words"
              error={errors.name}
              icon="user"
            />

            <Select
              label="Género"
              placeholder="Selecciona tu género"
              value={gender}
              onSelect={(value) => {
                setGender(value);
                if (errors.gender) {
                  setErrors({ ...errors, gender: undefined });
                }
              }}
              options={genderOptions}
              error={errors.gender}
            />

            <DatePicker
              label="Fecha de nacimiento"
              placeholder="Selecciona tu fecha"
              value={birthDate}
              onSelect={(date) => {
                setBirthDate(date);
                if (errors.birthDate) {
                  setErrors({ ...errors, birthDate: undefined });
                }
              }}
              error={errors.birthDate}
              maximumDate={maxDate}
              minimumDate={minDate}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Siguiente"
              onPress={handleNext}
              size="large"
              style={styles.nextButton}
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
    paddingTop: 40,
    paddingBottom: 40,
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
  nextButton: {
    width: '100%',
  },
});
