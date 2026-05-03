import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { profileService } from '@/services/profile';
import type { Profile } from '@/types/profile';

const activityLabels: Record<string, string> = {
  sedentary: 'Sedentario',
  light: 'Actividad ligera',
  moderate: 'Actividad moderada',
  active: 'Activo',
  very_active: 'Muy activo',
};

const goalLabels: Record<string, string> = {
  maintain: 'Mantener peso',
  lose: 'Perder peso',
  gain: 'Ganar peso',
};

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '-';
  return String(Math.round(value));
}

export default function OnboardingResultsScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profileData = await profileService.getProfile();
      setProfile(profileData);
    } catch {
      setError('No se pudieron cargar los resultados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await profileService.clearOnboardingDraft();
      router.replace('/(tabs)/today');
    } finally {
      setIsAccepting(false);
    }
  };

  const activity = profile?.nivel_actividad
    ? activityLabels[profile.nivel_actividad] ?? profile.nivel_actividad
    : '-';
  const goal = profile?.objetivo
    ? goalLabels[profile.objetivo] ?? profile.objetivo
    : '-';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <View style={styles.headerBackground} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Resultados</Text>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <>
            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.resultsTable}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Tu actividad semanal</Text>
                <Text style={styles.resultValue}>{activity}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Tu altura</Text>
                <Text style={styles.resultValue}>{formatNumber(profile?.altura)} cm</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Tu peso</Text>
                <Text style={styles.resultValue}>{formatNumber(profile?.peso)} kg</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, styles.highlightText]}>Tu TMB</Text>
                <Text style={[styles.resultValue, styles.highlightText]}>
                  {formatNumber(profile?.tmb)} kcal/dia
                </Text>
              </View>
              <View style={[styles.resultRow, styles.lastResultRow]}>
                <Text style={[styles.resultLabel, styles.highlightText]}>Tu GET</Text>
                <Text style={[styles.resultValue, styles.highlightText]}>
                  {formatNumber(profile?.get)} kcal/dia
                </Text>
              </View>
            </View>

            <Text style={styles.goalText}>Objetivo: {goal}</Text>
            <Text style={styles.caloriesText}>
              CALORIAS DIARIAS: {formatNumber(profile?.calorias_diarias)} kcal
            </Text>

            <Button
              title="Aceptar"
              onPress={handleAccept}
              loading={isAccepting}
              size="large"
              style={styles.acceptButton}
            />
          </>
        )}
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 56,
  },
  loadingBox: {
    paddingVertical: 80,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  resultsTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 48,
  },
  resultRow: {
    minHeight: 48,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  lastResultRow: {
    borderBottomWidth: 0,
  },
  resultLabel: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  resultValue: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 12,
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  highlightText: {
    color: Colors.primaryDark,
  },
  goalText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 18,
  },
  caloriesText: {
    color: Colors.primaryDark,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 56,
  },
  acceptButton: {
    width: '84%',
  },
});
